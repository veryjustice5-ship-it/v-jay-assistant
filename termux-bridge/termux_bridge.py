#!/usr/bin/env python3
"""
Termux CLI Bridge for Personal AI Messaging Assistant.
Runs directly on Android inside Termux with Termux:API installed.
Requires zero compilation or Android Studio!
"""

import sys
import time
import json
import subprocess
import urllib.request
import argparse

def get_args():
    parser = argparse.ArgumentParser(description="Termux Real Phone Bridge for Personal AI Assistant")
    parser.add_argument("--server", required=True, help="Assistant Server URL (e.g. https://... or http://192.168.1.50:3000)")
    parser.add_argument("--key", default="phone-link-secret-2026", help="Pairing Key")
    parser.add_argument("--interval", type=int, default=5, help="Polling interval in seconds")
    return parser.parse_args()

def run_termux_cmd(cmd_list):
    try:
        proc = subprocess.run(cmd_list, capture_output=True, text=True, check=True)
        return proc.stdout
    except Exception as e:
        print(f"[Error] Failed to execute {' '.join(cmd_list)}: {e}")
        return None

def sync_contacts(server_url, pairing_key):
    print("[*] Reading real Android address book via termux-contact-list...")
    raw = run_termux_cmd(["termux-contact-list"])
    if not raw:
        print("[-] Could not read contacts. Ensure 'Termux:API' app is installed and granted permission.")
        return

    try:
        contacts_raw = json.loads(raw)
        formatted = []
        for c in contacts_raw:
            name = c.get("name", "Unknown")
            number = c.get("number", "")
            if number:
                formatted.append({"name": name, "phone": number})

        print(f"[+] Found {len(formatted)} real contacts. Syncing to Assistant server...")
        req = urllib.request.Request(
            f"{server_url}/api/device/sync-contacts",
            data=json.dumps({"contacts": formatted}).encode('utf-8'),
            headers={
                "Content-Type": "application/json",
                "X-Device-Pairing-Key": pairing_key
            }
        )
        with urllib.request.urlopen(req) as resp:
            print(f"[+] Contacts synced successfully! Status: {resp.status}")
    except Exception as e:
        print(f"[-] Contact sync failed: {e}")

def poll_incoming_sms(server_url, pairing_key, last_seen_timestamps):
    raw = run_termux_cmd(["termux-sms-list", "-l", "10"])
    if not raw:
        return

    try:
        messages = json.loads(raw)
        for msg in messages:
            # Type 1 = received incoming
            if msg.get("type") == 1:
                ts = msg.get("received", "")
                if ts not in last_seen_timestamps:
                    last_seen_timestamps.add(ts)
                    sender = msg.get("number", "Unknown")
                    body = msg.get("body", "")

                    print(f"\n[!] Real incoming SMS detected from {sender}: '{body}'")
                    # Forward to Assistant Pipeline
                    req = urllib.request.Request(
                        f"{server_url}/api/device/message-ingress",
                        data=json.dumps({
                            "channel": "sms",
                            "sender": sender,
                            "body": body,
                            "timestamp": int(time.time() * 1000)
                        }).encode('utf-8'),
                        headers={
                            "Content-Type": "application/json",
                            "X-Device-Pairing-Key": pairing_key
                        }
                    )
                    with urllib.request.urlopen(req) as resp:
                        print(f"[+] Dispatched to Assistant Pipeline! Status: {resp.status}")
    except Exception as e:
        print(f"[-] SMS polling error: {e}")

def main():
    args = get_args()
    print("=" * 60)
    print("🚀 Personal AI Assistant - Termux Real Phone Bridge Active")
    print(f"   Target Server: {args.server}")
    print(f"   Pairing Key:   {args.key}")
    print("=" * 60)

    # 1. Sync real contacts on boot
    sync_contacts(args.server, args.key)

    # 2. Main monitoring loop for incoming real SMS
    last_seen = set()
    print("\n[*] Listening for real incoming messages... (Press Ctrl+C to stop)")
    while True:
        try:
            poll_incoming_sms(args.server, args.key, last_seen)
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n[-] Bridge terminated by user.")
            sys.exit(0)
        except Exception as e:
            time.sleep(args.interval)

if __name__ == '__main__':
    main()
