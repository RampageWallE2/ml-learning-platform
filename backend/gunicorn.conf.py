"""Small-instance defaults; workers and pool sizes must be tuned together."""
import os

bind = "0.0.0.0:5000"
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
timeout = 30
graceful_timeout = 30
keepalive = 5
max_requests = 1000
max_requests_jitter = 100
accesslog = "-"
errorlog = "-"
# Do not log the request URI, query, Referer, IP, Authorization or cookies.
access_log_format = 'method=%(m)s status=%(s)s duration_us=%(D)s'
forwarded_allow_ips = ""  # No ProxyFix or user-supplied forwarded-header trust.
