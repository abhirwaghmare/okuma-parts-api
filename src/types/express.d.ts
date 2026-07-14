import 'express-session';

declare module 'express-session' {
    interface SessionData {
        /** BC customer ID bound to this session after login. */
        customerId?: string;
        cartId?: string;
    }
}
