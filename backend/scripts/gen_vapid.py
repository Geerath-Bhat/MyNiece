"""
Run once to generate VAPID keys for Web Push notifications.
Usage: python scripts/gen_vapid.py

Copy the output into your .env file.
"""
from py_vapid import Vapid

v = Vapid()
v.generate_keys()

print("Add these to your .env:\n")
print(f"VAPID_PRIVATE_KEY={v.private_key_str.decode()}")
print(f"VAPID_PUBLIC_KEY={v.public_key_str.decode()}")
print("\nAdd this to your frontend .env:\n")
print(f"VITE_VAPID_PUBLIC_KEY={v.public_key_str.decode()}")
