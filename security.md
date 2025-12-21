# Security & Rate Limiting Setup

## 🔒 Security Features

This application includes comprehensive security features to protect against common attacks:

### 1. **Rate Limiting**
- **Global API rate limiting** in middleware
- **Redis-based** (Upstash) for multi-instance serverless deployments
- **Automatic fallback** to in-memory when Redis is not configured
- Different limits for different endpoint types:
  - Regular API calls: 60 requests/minute
  - Write operations (POST/PUT/DELETE): 20 requests/minute
  - Auth/Admin endpoints: 10 requests/minute

### 2. **Security Headers**
All responses include security headers:
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (production only)
- `Permissions-Policy` - Restricts browser features

### 3. **Request Validation**
- **Payload size limit**: 10MB maximum
- **IP-based rate limiting**
- **Automated cleanup** of old rate limit entries

### 4. **Database Connection Pooling**
- **Singleton Prisma Client** prevents connection pool exhaustion
- Optimized for serverless environments (Vercel, AWS Lambda)

---

## ⚙️ Setup Instructions

### Option 1: Redis Rate Limiting (Recommended for Production)

**Benefits:**
- ✅ Works across multiple serverless instances
- ✅ Persistent rate limiting
- ✅ Free tier: 10,000 requests/day
- ✅ No cold start issues

**Setup:**

1. Sign up at [Upstash](https://upstash.com)
2. Create a new Redis database
3. Copy credentials and add to `.env`:

```env
# Redis Rate Limiting (Upstash) - OPTIONAL but recommended for production
# Free tier: 10k requests/day - https://upstash.com
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

4. Deploy - rate limiting will automatically use Redis

### Option 2: In-Memory Fallback (Development/Testing)

**No setup required!** If Redis environment variables are not set, the application automatically uses in-memory rate limiting.

**Note:** In-memory rate limiting does NOT work properly in multi-instance serverless deployments (each instance has its own counter).

---

## 🧪 Testing Rate Limiting

### Test with curl:

```bash
# Test API rate limit (should allow 60 requests/minute)
for i in {1..65}; do
  curl -i http://localhost:3000/api/products
  echo "Request $i"
done

# Expected: First 60 succeed, requests 61-65 return HTTP 429
```

### Check rate limit headers:

```bash
curl -i http://localhost:3000/api/products
# Look for headers:
# X-RateLimit-Limit: 60
# X-RateLimit-Remaining: 59
# X-RateLimit-Reset: <timestamp>
```

---

## 📊 Monitoring

### Production Monitoring:

1. **Upstash Dashboard**: View rate limit hits, Redis performance
2. **Vercel Analytics**: Monitor 429 responses
3. **Application Logs**: Check `[RATELIMIT]` prefixed logs

### Common Log Messages:

```
[RATELIMIT] Redis connected successfully
[RATELIMIT] Redis not configured, using in-memory fallback
[RATELIMIT] Redis error, falling back to in-memory
```

---

## 🔧 Configuration

### Adjust Rate Limits:

Edit `src/middleware.ts`:

```typescript
// Default: 60 requests per minute
let limit = 60;
let windowMs = 60 * 1000;

// Stricter for writes
if (req.method === 'POST' || ...) {
  limit = 20;
}

// Even stricter for auth
if (pathname.includes('/auth/')) {
  limit = 10;
}
```

### Disable Rate Limiting (Not Recommended):

Comment out rate limiting block in `src/middleware.ts`:

```typescript
// if (pathname.startsWith('/api')) {
//   ... rate limiting code ...
// }
```

---

## 🚨 Troubleshooting

### Issue: "Too many requests" in development

**Solution:** Redis is caching across hot reloads. Either:
1. Wait 1 minute for window to reset
2. Clear Redis: `await redis.flushdb()` in Redis dashboard
3. Use in-memory (remove Redis env vars for development)

### Issue: Rate limiting not working in production

**Cause:** In-memory fallback doesn't work in serverless

**Solution:** Set up Upstash Redis (see Option 1 above)

### Issue: "Failed to connect to Redis"

**Check:**
1. `UPSTASH_REDIS_REST_URL` is correct
2. `UPSTASH_REDIS_REST_TOKEN` is correct
3. Network allows HTTPS connections to Upstash

**Fallback:** App automatically uses in-memory if Redis fails

---

## 📈 Performance Impact

- **Redis rate limiting**: ~5-15ms per request
- **In-memory rate limiting**: ~0.1-1ms per request
- **Security headers**: ~0.01ms per request

Total overhead: **~5-16ms per API request** with Redis

---

## 🔐 Additional Security Recommendations

1. **Enable HTTPS** in production (automatic on Vercel)
2. **Set up CAPTCHA** for public forms (contact, register)
3. **Monitor logs** for suspicious IP patterns
4. **Set up IP blacklisting** for repeat offenders
5. **Enable CORS** restrictions if API is public
6. **Review and update** rate limits based on traffic patterns

---

## 📚 References

- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
