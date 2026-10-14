// The OpenAPI export builds the app but never connects or signs anything.
process.env.DATABASE_URL ??= 'postgresql://unused:unused@localhost:5432/unused';
process.env.JWT_SECRET ??= 'openapi-export-does-not-sign-anything-at-all';
