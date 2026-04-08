# Firebase Auth Email Templates (LiveZapp)

Use this with Firebase Console -> Authentication -> Templates.

## Global sender settings

- Sender name: `Live-Zapp Site Admin`
- From: `no-reply@live-zapp.com`
- Reply-to: `site-admin@live-zapp.com`

## 1) Email address verification

### Suggested subject
`Verify your LiveZapp account`

### Suggested body
Hello,

Thanks for creating your LiveZapp account.

Please confirm your email address to activate your account:

`%LINK%`

If you did not create this account, you can ignore this email.

Regards,  
Live-Zapp Site Admin

## 2) Password reset

### Suggested subject
`Reset your LiveZapp password`

### Suggested body
Hello,

We received a request to reset your LiveZapp password.

Use the link below to choose a new password:

`%LINK%`

If you did not request this, you can safely ignore this email.

Regards,  
Live-Zapp Site Admin

## Notes

- `%LINK%` is injected by Firebase and must remain unchanged.
- LiveZapp backend includes a continue URL in OOB requests and will default to `/login` on the canonical site URL unless overridden by `AUTH_EMAIL_CONTINUE_URL`.
