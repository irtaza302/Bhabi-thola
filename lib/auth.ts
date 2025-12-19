import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'bhabi-thola-super-secret-key';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(password, hashed);
}

export async function createToken(payload: any): Promise<string> {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(encodedSecret);
}

export async function verifyToken(token: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(token, encodedSecret);
        return payload;
    } catch (error) {
        return null;
    }
}
