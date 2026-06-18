# Kolman første operative versjon

Denne versjonen legger inn en første operativ versjon av:
- premium login-side
- e-post + passord
- tilgang for inviterte e-postadresser
- beskyttede sider
- egne data per innlogget megler
- egen import per konto

## Viktig
- Kun e-postadresser i allow-listen får opprette konto og logge inn.
- Hver megler ser bare sine egne data.
- Megleren velger passordet sitt selv.

## Første oppsett
1. Kopier `.env.local` inn i prosjektet
2. Legg inn `ALLOWED_ACCESS_EMAILS` eller bruk eksisterende `ALLOWED_BETA_EMAILS`
3. Sørg for at Supabase Auth er aktivert for e-post/passord
4. Start prosjektet
5. Gå til `/login`
6. Opprett konto med godkjent e-postadresse
