# LiveZapp Email Operations Checklist

This runbook covers domain email + auth email setup for `live-zapp.com` using:

- Titan-hosted mailbox: `site-admin@live-zapp.com`
- Aliases: `no-reply@live-zapp.com`, `billing@live-zapp.com`, `security@live-zapp.com`
- Firebase Auth templates for verification and reset emails

## 1) Mailbox and alias strategy

- Primary mailbox: `site-admin@live-zapp.com`
- Outbound auth sender: `no-reply@live-zapp.com` (alias)
- Reply-to: `site-admin@live-zapp.com`

This keeps sender identity clean while routing replies to your monitored inbox.

## 2) Titan DNS records (required)

Publish the exact record values from Titan admin for:

- SPF (TXT on root)
- DKIM (TXT or CNAME selectors)
- MX (if not already set)

Then add DMARC on `_dmarc.live-zapp.com`:

1. Start in monitor mode:
   - `v=DMARC1; p=none; rua=mailto:site-admin@live-zapp.com; adkim=s; aspf=s`
2. After 3-7 days of clean reports:
   - move to `p=quarantine`
3. After another monitoring window:
   - move to `p=reject`

## 3) Firebase Auth template configuration

In Firebase Console:

- Authentication -> Templates
- Set sender display name: `Live-Zapp Site Admin`
- Set from address: `no-reply@live-zapp.com`
- Set reply-to: `site-admin@live-zapp.com`
- Update both:
  - Email address verification template
  - Password reset template

## 4) App backend behavior

The admin user management route sends OOB emails through Firebase Identity Toolkit:

- File: `app/api/admin/users/manage/route.ts`
- Endpoint used: `accounts:sendOobCode`

LiveZapp now includes a canonical continue URL in those requests:

- `AUTH_EMAIL_CONTINUE_URL` (if set), else
- `https://live-zapp.com/login` (derived from app site config)

### Environment variable (optional, recommended)

Set on production server:

- `AUTH_EMAIL_CONTINUE_URL=https://live-zapp.com/login`

Use this if you want explicit control over post-action redirect.

## 5) Validation checklist

1. DNS verification:
   - Confirm SPF, DKIM, DMARC all pass using your DNS checker of choice.
   - Quick CLI checks:
     - `nslookup -type=txt live-zapp.com`
     - `nslookup -type=txt _dmarc.live-zapp.com`
     - `nslookup -type=mx live-zapp.com`
2. Functional tests from admin panel:
   - Send one password reset email.
   - Send one verification email.
3. Validate received message:
   - From: `Live-Zapp Site Admin <no-reply@live-zapp.com>`
   - Reply-To: `site-admin@live-zapp.com`
   - Links open on `live-zapp.com` and return to login flow.
4. Deliverability:
   - Test Inbox + Spam placement on at least Gmail and Outlook.

## 6) Ongoing operations

- Review DMARC aggregate reports weekly.
- Keep aliases active even if a dedicated mailbox is added later.
- If support volume grows, add `support@live-zapp.com` alias/mailbox and update templates for support references.
