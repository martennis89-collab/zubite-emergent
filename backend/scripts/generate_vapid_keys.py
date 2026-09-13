"""One-off: generate a VAPID keypair for Web Push (Общност thread-follow
notifications).

Run once per environment that needs its own keys (local dev already has a
pair in backend/.env; production needs its own, set on Render):

    python -m scripts.generate_vapid_keys

Prints VAPID_PRIVATE_KEY / VAPID_PUBLIC_KEY as base64url, matching the raw
32-byte private scalar + uncompressed EC point format pywebpush/py_vapid
expect — the same format used by config.py's VAPID_PRIVATE_KEY/
VAPID_PUBLIC_KEY. Never reuse the same pair across environments: a leaked
private key would let anyone forge push sends that look like they came from
this server.
"""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    priv_raw = private_key.private_numbers().private_value.to_bytes(32, "big")
    pub_raw = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

    print(f"VAPID_PRIVATE_KEY={b64url(priv_raw)}")
    print(f"VAPID_PUBLIC_KEY={b64url(pub_raw)}")


if __name__ == "__main__":
    main()
