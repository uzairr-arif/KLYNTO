/**
 * Klynto Fix Center snippet library.
 *
 * Snippets are STARTING POINTS, not universally safe configurations. The UI
 * must always label them as such. Platforms without a meaningful snippet for
 * a control are simply omitted (e.g. cookies are an application-layer concern
 * and are not configurable in Cloudflare).
 */

export type PlatformId =
  'express' | 'nextjs' | 'nginx' | 'apache' | 'wordpress' | 'php' | 'cloudflare' | 'django';

export type FixControlId =
  | 'hsts'
  | 'csp'
  | 'xcto'
  | 'frame'
  | 'referrer'
  | 'permissions-policy'
  | 'coop'
  | 'coep'
  | 'https-redirect'
  | 'cookie-secure'
  | 'cookie-httponly'
  | 'cookie-samesite'
  | 'hide-server'
  | 'remove-obsolete';

export interface FixPlatform {
  id: PlatformId;
  label: string;
}

export const FIX_PLATFORMS: FixPlatform[] = [
  { id: 'express', label: 'Express / Node' },
  { id: 'nextjs', label: 'Next.js' },
  { id: 'nginx', label: 'NGINX' },
  { id: 'apache', label: 'Apache' },
  { id: 'wordpress', label: 'WordPress' },
  { id: 'php', label: 'PHP' },
  { id: 'cloudflare', label: 'Cloudflare' },
  { id: 'django', label: 'Django' },
];

interface FixSnippet {
  language: string;
  code: string;
  note?: string;
}

export const FIX_LIBRARY: Record<FixControlId, Partial<Record<PlatformId, FixSnippet>>> = {
  hsts: {
    express: {
      language: 'js',
      code: `// Only send HSTS once your site is HTTPS-only.
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Or with helmet:
// app.use(helmet.strictTransportSecurity({ maxAge: 31536000, includeSubDomains: true }));`,
    },
    nextjs: {
      language: 'js',
      code: `// next.config.js - start with a small max-age and raise it once confident
module.exports = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    }];
  },
};`,
    },
    nginx: {
      language: 'nginx',
      code: `# Only on the HTTPS server block.
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`,
    },
    apache: {
      language: 'apache',
      code: `# Only on the HTTPS virtual host.
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"`,
    },
    wordpress: {
      language: 'apache',
      code: `# .htaccess (HTTPS virtual host / top of file)
<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>`,
    },
    php: {
      language: 'php',
      code: `<?php
// Early in the front controller, only when serving HTTPS.
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');`,
    },
    cloudflare: {
      language: 'text',
      code: `Cloudflare dashboard → SSL/TLS → Edge Certificates:
- Enable "HTTP Strict Transport Security (HSTS)".
- Start with a small max-age (e.g. 1 month) and raise it once confident.`,
    },
    django: {
      language: 'python',
      code: `# settings.py - only when the site is HTTPS-only.
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_PRELOAD = True  # only if you intend to submit to the preload list`,
    },
  },

  csp: {
    express: {
      language: 'js',
      code: `// Start strict, then relax only what the app needs. Iterate using Report-Only.
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data:",
      "script-src 'self'",
      "style-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'frame-ancestors \\'self\\'',
      'upgrade-insecure-requests',
    ].join('; ')
  );
  next();
});`,
    },
    nextjs: {
      language: 'js',
      code: `// next.config.js - start strict; Next.js inlines scripts, so hashes/nonces
// may be needed before removing 'unsafe-inline'.
module.exports = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [{
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; upgrade-insecure-requests",
      }],
    }];
  },
};`,
    },
    nginx: {
      language: 'nginx',
      code: `add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests" always;`,
    },
    apache: {
      language: 'apache',
      code: `Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests"`,
    },
    wordpress: {
      language: 'php',
      code: `<?php
// functions.php - start strict and test before enforcing.
add_action('send_headers', function () {
  header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");
});`,
    },
    php: {
      language: 'php',
      code: `<?php
header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");`,
    },
    cloudflare: {
      language: 'text',
      code: `Cloudflare dashboard → Rules → Transform Rules → Response Header:
Set static header "Content-Security-Policy" for your zone.
Prefer managing CSP at the application layer; use Cloudflare only as a stopgap.`,
    },
    django: {
      language: 'python',
      code: `# With django-csp >= 4.0 (pip install django-csp)
CSP = {
    "default-src": ["'self'"],
    "img-src": ["'self'", "data:"],
    "script-src": ["'self'"],
    "style-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
}`,
    },
  },

  xcto: {
    express: {
      language: 'js',
      code: `app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
// helmet: app.use(helmet.noSniff());`,
    },
    nextjs: {
      language: 'js',
      code: `// next.config.js
headers: [{ source: '/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }] }]`,
    },
    nginx: {
      language: 'nginx',
      code: `add_header X-Content-Type-Options "nosniff" always;`,
    },
    apache: {
      language: 'apache',
      code: `Header always set X-Content-Type-Options "nosniff"`,
    },
    wordpress: {
      language: 'apache',
      code: `# .htaccess
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
</IfModule>`,
    },
    php: {
      language: 'php',
      code: `<?php header('X-Content-Type-Options: nosniff');`,
    },
    cloudflare: {
      language: 'text',
      code: `Cloudflare dashboard → Rules → Transform Rules → Response Header:
Set static header X-Content-Type-Options: nosniff for your zone.`,
    },
    django: {
      language: 'python',
      code: `# settings.py
SECURE_CONTENT_TYPE_NOSNIFF = True`,
    },
  },

  frame: {
    express: {
      language: 'js',
      code: `// Prefer CSP frame-ancestors (modern) and/or X-Frame-Options (legacy).
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
// helmet: app.use(helmet.frameguard({ action: 'deny' }));`,
    },
    nextjs: {
      language: 'js',
      code: `// next.config.js
headers: [{ source: '/:path*', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }]`,
    },
    nginx: {
      language: 'nginx',
      code: `add_header X-Frame-Options "DENY" always;
# Modern alternative/addition:
# add_header Content-Security-Policy "frame-ancestors 'none'" always;`,
    },
    apache: {
      language: 'apache',
      code: `Header always set X-Frame-Options "DENY"`,
    },
    wordpress: {
      language: 'apache',
      code: `# .htaccess
<IfModule mod_headers.c>
  Header always set X-Frame-Options "DENY"
</IfModule>`,
    },
    php: {
      language: 'php',
      code: `<?php header('X-Frame-Options: DENY');`,
    },
    cloudflare: {
      language: 'text',
      code: `Cloudflare dashboard → Rules → Transform Rules → Response Header:
Set static header X-Frame-Options: DENY for your zone.`,
    },
    django: {
      language: 'python',
      code: `# settings.py (X-Frame-Options middleware is on by default with SAMEORIGIN)
X_FRAME_OPTIONS = 'DENY'`,
    },
  },

  referrer: {
    express: {
      language: 'js',
      code: `app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});`,
    },
    nextjs: {
      language: 'js',
      code: `// next.config.js
headers: [{ source: '/:path*', headers: [{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }] }]`,
    },
    nginx: {
      language: 'nginx',
      code: `add_header Referrer-Policy "strict-origin-when-cross-origin" always;`,
    },
    apache: {
      language: 'apache',
      code: `Header always set Referrer-Policy "strict-origin-when-cross-origin"`,
    },
    wordpress: {
      language: 'apache',
      code: `# .htaccess
<IfModule mod_headers.c>
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>`,
    },
    php: {
      language: 'php',
      code: `<?php header('Referrer-Policy: strict-origin-when-cross-origin');`,
    },
    cloudflare: {
      language: 'text',
      code: `Cloudflare dashboard → Rules → Transform Rules → Response Header:
Set static header Referrer-Policy: strict-origin-when-cross-origin for your zone.`,
    },
    django: {
      language: 'python',
      code: `# settings.py
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'`,
    },
  },

  'permissions-policy': {
    express: {
      language: 'js',
      code: `app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});`,
    },
    nextjs: {
      language: 'js',
      code: `// next.config.js - deny features the app does not use
headers: [{ source: '/:path*', headers: [{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }] }]`,
    },
    nginx: {
      language: 'nginx',
      code: `add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;`,
    },
    apache: {
      language: 'apache',
      code: `Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"`,
    },
    php: {
      language: 'php',
      code: `<?php header('Permissions-Policy: camera=(), microphone=(), geolocation=()');`,
    },
    cloudflare: {
      language: 'text',
      code: `Cloudflare dashboard → Rules → Transform Rules → Response Header:
Set static header Permissions-Policy for your zone.`,
    },
  },

  coop: {
    express: {
      language: 'js',
      code: `app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});`,
    },
    nextjs: {
      language: 'js',
      code: `// next.config.js
headers: [{ source: '/:path*', headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }] }]`,
    },
    nginx: {
      language: 'nginx',
      code: `add_header Cross-Origin-Opener-Policy "same-origin" always;`,
    },
    apache: {
      language: 'apache',
      code: `Header always set Cross-Origin-Opener-Policy "same-origin"`,
    },
    php: {
      language: 'php',
      code: `<?php header('Cross-Origin-Opener-Policy: same-origin');`,
    },
    django: {
      language: 'python',
      code: `# settings.py (Django 4.0+)
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'`,
    },
  },

  coep: {
    express: {
      language: 'js',
      code: `// Only needed when enabling cross-origin isolation (SharedArrayBuffer, etc.).
// Subresources must then send CORP/CORS headers or they will be blocked.
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});`,
    },
    nginx: {
      language: 'nginx',
      code: `# Only when enabling cross-origin isolation; may break non-CORS resources.
add_header Cross-Origin-Embedder-Policy "require-corp" always;`,
    },
    php: {
      language: 'php',
      code: `<?php header('Cross-Origin-Embedder-Policy: require-corp');`,
    },
  },

  'https-redirect': {
    express: {
      language: 'js',
      code: `app.enable('trust proxy');
app.use((req, res, next) => {
  if (req.secure) return next();
  res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
});`,
    },
    nextjs: {
      language: 'js',
      code: `// Next.js redirects HTTP to HTTPS automatically in most deployments.
// Self-hosting behind your own proxy? Redirect there (NGINX/Apache examples).`,
    },
    nginx: {
      language: 'nginx',
      code: `server {
  listen 80;
  server_name example.com;
  return 301 https://$host$request_uri;
}`,
    },
    apache: {
      language: 'apache',
      code: `RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`,
    },
    wordpress: {
      language: 'apache',
      code: `# .htaccess (before the WordPress rules)
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`,
    },
    php: {
      language: 'php',
      code: `<?php
if (($_SERVER['HTTPS'] ?? '') !== 'on') {
  header('Location: https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'], true, 301);
  exit;
}`,
    },
    cloudflare: {
      language: 'text',
      code: `Cloudflare dashboard → SSL/TLS → Edge Certificates:
Enable "Always Use HTTPS" (301 redirect).`,
    },
    django: {
      language: 'python',
      code: `# settings.py
SECURE_SSL_REDIRECT = True`,
    },
  },

  'cookie-secure': {
    express: {
      language: 'js',
      code: `app.use(session({
  cookie: { secure: true },
}));`,
    },
    nextjs: {
      language: 'js',
      code: `// Route handler / Server Action
response.cookies.set('session', value, { secure: true });`,
    },
    nginx: {
      language: 'nginx',
      code: `# NGINX 1.19.3+ - flag cookies set by an upstream app
proxy_cookie_flags ~ secure;`,
    },
    apache: {
      language: 'apache',
      code: `# Prefer fixing this in the application. As a stopgap:
Header always edit Set-Cookie "^([^;]*)$" "$1; Secure"`,
    },
    php: {
      language: 'php',
      code: `<?php
setcookie('name', $value, [
  'secure' => true,
]);`,
    },
    django: {
      language: 'python',
      code: `# settings.py
SESSION_COOKIE_SECURE = True`,
    },
  },

  'cookie-httponly': {
    express: {
      language: 'js',
      code: `app.use(session({
  cookie: { httpOnly: true },
}));`,
    },
    nextjs: {
      language: 'js',
      code: `// Route handler / Server Action
response.cookies.set('session', value, { httpOnly: true });`,
    },
    nginx: {
      language: 'nginx',
      code: `proxy_cookie_flags ~ httponly;`,
    },
    php: {
      language: 'php',
      code: `<?php
setcookie('name', $value, [
  'httponly' => true,
]);`,
    },
    django: {
      language: 'python',
      code: `# settings.py (HttpOnly is the Django default)
SESSION_COOKIE_HTTPONLY = True`,
    },
  },

  'cookie-samesite': {
    express: {
      language: 'js',
      code: `app.use(session({
  cookie: { sameSite: 'lax' }, // or 'strict' if the app allows
}));`,
    },
    nextjs: {
      language: 'js',
      code: `// Route handler / Server Action
response.cookies.set('session', value, { sameSite: 'lax' });`,
    },
    nginx: {
      language: 'nginx',
      code: `proxy_cookie_flags ~ samesite=lax;`,
    },
    php: {
      language: 'php',
      code: `<?php
setcookie('name', $value, [
  'samesite' => 'Lax',
]);`,
    },
    django: {
      language: 'python',
      code: `# settings.py
SESSION_COOKIE_SAMESITE = 'Lax'`,
    },
  },

  'hide-server': {
    express: {
      language: 'js',
      code: `app.disable('x-powered-by');`,
    },
    nextjs: {
      language: 'js',
      code: `// next.config.js
module.exports = { poweredByHeader: false };`,
    },
    nginx: {
      language: 'nginx',
      code: `# http/server block
server_tokens off;`,
    },
    apache: {
      language: 'apache',
      code: `ServerTokens Prod
ServerSignature Off`,
    },
    php: {
      language: 'ini',
      code: `; php.ini
expose_php = Off`,
    },
    cloudflare: {
      language: 'text',
      code: `Cloudflare dashboard → Rules → Managed Transforms:
Enable "Remove Server header" and related response header cleanups.`,
    },
  },

  'remove-obsolete': {
    nginx: {
      language: 'nginx',
      code: `# X-XSS-Protection is obsolete in modern browsers; "0" avoids legacy auditor quirks.
add_header X-XSS-Protection "0" always;
# Or simply remove leftovers:
# proxy_hide_header X-XSS-Protection;
# proxy_hide_header X-UA-Compatible;`,
    },
    apache: {
      language: 'apache',
      code: `Header unset X-XSS-Protection
Header unset X-UA-Compatible
Header unset Expect-CT`,
    },
    express: {
      language: 'js',
      code: `app.use((req, res, next) => {
  res.removeHeader('X-XSS-Protection');
  res.removeHeader('X-UA-Compatible');
  next();
});`,
    },
    php: {
      language: 'php',
      code: `<?php
header_remove('X-XSS-Protection');
header_remove('X-UA-Compatible');`,
    },
  },
};

export interface ResolvedFix {
  platform: PlatformId;
  platformLabel: string;
  language: string;
  code: string;
  note?: string;
}

export function isFixPlatform(value: string): value is PlatformId {
  return FIX_PLATFORMS.some((p) => p.id === value);
}

export function getFixes(control: FixControlId): ResolvedFix[] {
  const entries = FIX_LIBRARY[control] ?? {};
  return FIX_PLATFORMS.flatMap((platform) => {
    const snippet = entries[platform.id];
    if (!snippet) return [];
    return [
      {
        platform: platform.id,
        platformLabel: platform.label,
        language: snippet.language,
        code: snippet.code,
        note: snippet.note,
      },
    ];
  });
}
