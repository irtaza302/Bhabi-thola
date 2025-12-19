import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashPassword, createToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        let body;
        try {
            body = await request.json();
        } catch (parseError: any) {
            return NextResponse.json({ 
                error: 'Invalid request body',
                message: 'Failed to parse request data'
            }, { status: 400 });
        }
        
        const { username, password, name, email } = body;

        if (!username || !password || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Normalize email: convert empty string to null/undefined
        // This prevents unique constraint violations with empty strings
        const normalizedEmail = email && email.trim() !== '' ? email.trim() : null;

        // Check if user already exists by username
        let existingUser;
        try {
            existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
        } catch (dbError: any) {
            console.error('Database query error (check existing):', dbError);
            return NextResponse.json({ 
                error: 'Database connection error',
                details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            }, { status: 500 });
        }

        if (existingUser.length > 0) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }

        // Check if email already exists (only if email is provided)
        if (normalizedEmail) {
            try {
                const existingEmail = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
                if (existingEmail.length > 0) {
                    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
                }
            } catch (dbError: any) {
                // If email column doesn't exist or other error, continue (email is optional)
                console.warn('Error checking email:', dbError.message);
            }
        }

        // Hash password
        let hashedPassword;
        try {
            hashedPassword = await hashPassword(password);
        } catch (hashError: any) {
            console.error('Password hashing error:', hashError);
            return NextResponse.json({ 
                error: 'Failed to process password',
                message: hashError.message || 'Password hashing failed',
            }, { status: 500 });
        }

        let newUser;
        try {
            // Build the insert values object, only including email if it's not null
            const insertValues: any = {
                username,
                password: hashedPassword,
                name,
            };
            
            // Only add email if it's not null/undefined
            if (normalizedEmail !== null && normalizedEmail !== undefined) {
                insertValues.email = normalizedEmail;
            }
            
            [newUser] = await db.insert(users).values(insertValues).returning();
        } catch (dbError: any) {
            console.error('Database insert error:', dbError);
            
            // Check for duplicate key violations
            // Neon errors have the constraint info in dbError.cause
            const errorCause = dbError.cause || dbError;
            const errorCode = errorCause.code || dbError.code;
            const errorConstraint = errorCause.constraint || dbError.constraint;
            const errorMessage = errorCause.message || dbError.message || '';
            const errorDetail = errorCause.detail || dbError.detail || '';
            
            if (errorCode === '23505' || errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
                // Check which field caused the violation
                if (errorConstraint?.includes('username') || errorMessage.includes('username') || errorDetail.includes('username')) {
                    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
                }
                if (errorConstraint?.includes('email') || errorMessage.includes('email') || errorDetail.includes('email')) {
                    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
                }
                return NextResponse.json({ error: 'User already exists' }, { status: 409 });
            }
            
            // Check if it's a table doesn't exist error
            if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation')) {
                return NextResponse.json({ 
                    error: 'Database tables not found. Please run migrations.',
                    details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
                }, { status: 500 });
            }
            
            // Return error message in production too for debugging
            const errorMsg = errorCause.message || dbError.message || 'Unknown database error';
            console.error('Full database error:', {
                message: errorMsg,
                code: errorCode,
                constraint: errorConstraint,
                detail: errorDetail,
                cause: errorCause,
                stack: dbError.stack
            });
            
            return NextResponse.json({ 
                error: 'Failed to create user',
                message: errorMsg, // Include error message for debugging
                code: dbError.code,
            }, { status: 500 });
        }

        // Create JWT token
        let token;
        try {
            token = await createToken({ id: newUser.id, username: newUser.username });
        } catch (tokenError: any) {
            console.error('Token creation error:', tokenError);
            return NextResponse.json({ 
                error: 'Failed to create authentication token',
                message: tokenError.message || 'Token creation failed',
            }, { status: 500 });
        }

        // Create response
        const response = NextResponse.json({
            user: { id: newUser.id, username: newUser.username, name: newUser.name }
        });

        // Set cookie
        try {
            response.cookies.set('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            });
        } catch (cookieError: any) {
            console.error('Cookie setting error:', cookieError);
            // Continue even if cookie setting fails - token is still in response
            // User can manually store it if needed
        }

        return response;
    } catch (error: any) {
        console.error('Signup error:', error);
        const errorMessage = error.message || 'Internal server error';
        return NextResponse.json({ 
            error: errorMessage,
            message: errorMessage, // Include for debugging
            type: error.name || 'Error',
        }, { status: 500 });
    }
}
