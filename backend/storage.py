"""Object storage — Cloudflare R2 over the S3 API.

Replaces Emergent's proprietary object store (`integrations.emergentagent
.com/objstore`), which was the last runtime dependency on the platform
this project is migrating off, and which had left uploads disabled in
every environment that did not carry an `EMERGENT_LLM_KEY`.

The public contract is unchanged so callers did not need editing:
    init_storage()                        -> client | None
    put_object(path, data, content_type)  -> {"path": str, "size": int}
    get_object(path)                      -> (bytes, content_type)

The bucket is private. Objects are only ever read back through
`GET /api/files/{id}`, which looks the record up in `uploaded_files`
first, so there is no public bucket, no custom domain, and no URL a
patient-uploaded file could be fetched from by guessing.
"""

from typing import Optional, Tuple

from fastapi import HTTPException

from config import (
    R2_ENDPOINT,
    R2_BUCKET,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    logger,
)

_client = None
_bucket: Optional[str] = None

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp"
}


def _split_endpoint(endpoint: str, bucket: str) -> Tuple[str, str]:
    """Tolerate the endpoint being pasted with the bucket still on it.

    Cloudflare's dashboard presents the S3 API as one URL ending in the
    bucket name (`https://<account>.r2.cloudflarestorage.com/zubitebg`),
    but boto3 wants the account endpoint and the bucket separately. If the
    two are passed joined, split them rather than signing requests against
    `.../zubitebg/zubitebg/...`.
    """
    endpoint = (endpoint or "").rstrip("/")
    if bucket and endpoint.endswith(f"/{bucket}"):
        endpoint = endpoint[: -(len(bucket) + 1)]
    return endpoint, bucket


def init_storage():
    """Build the S3 client. Safe to call repeatedly; call once at startup.

    Returns None (rather than raising) when R2 is unconfigured, so a
    developer without credentials still gets a booting backend — the same
    behaviour the Emergent client had. Upload endpoints then fail closed
    with a 503 from `put_object`.
    """
    global _client, _bucket
    if _client is not None:
        return _client
    if not (R2_ENDPOINT and R2_BUCKET and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY):
        logger.warning(
            "R2 not configured (need R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, "
            "R2_SECRET_ACCESS_KEY) - file uploads disabled"
        )
        return None
    try:
        import boto3
        from botocore.config import Config

        endpoint, bucket = _split_endpoint(R2_ENDPOINT, R2_BUCKET)
        _client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            # R2 requires SigV4 and ignores the region, but botocore still
            # demands one — "auto" is Cloudflare's documented placeholder.
            region_name="auto",
            config=Config(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "standard"},
                connect_timeout=10,
                read_timeout=120,
            ),
        )
        _bucket = bucket
        logger.info(f"R2 object storage initialised (bucket={bucket})")
        return _client
    except Exception as e:
        logger.error(f"Failed to initialise R2 storage: {e}")
        _client = None
        return None


def _require_client():
    client = init_storage()
    if not client or not _bucket:
        raise HTTPException(status_code=503, detail="Storage not available")
    return client


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload bytes to R2. Returns the shape callers already persist onto
    `uploaded_files` — `path` (the storage key) and `size`."""
    client = _require_client()
    try:
        client.put_object(
            Bucket=_bucket,
            Key=path,
            Body=data,
            ContentType=content_type,
        )
    except Exception as e:
        # The caller logs and turns this into a 500; keep the bucket name
        # out of the message it may echo.
        logger.error(f"R2 put_object failed for key={path}: {e}")
        raise HTTPException(status_code=502, detail="Storage write failed")
    return {"path": path, "size": len(data)}


def get_object(path: str) -> tuple:
    """Download from R2. Returns (content_bytes, content_type)."""
    client = _require_client()
    try:
        resp = client.get_object(Bucket=_bucket, Key=path)
        body = resp["Body"].read()
        return body, resp.get("ContentType") or "application/octet-stream"
    except client.exceptions.NoSuchKey:
        raise HTTPException(status_code=404, detail="File not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"R2 get_object failed for key={path}: {e}")
        raise HTTPException(status_code=502, detail="Storage read failed")
