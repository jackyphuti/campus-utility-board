const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const { isAllowedCampusEmail } = require('./universityDomains');

function getPrimaryEmail(profile) {
  if (!profile) return '';
  const emailFromList = Array.isArray(profile.emails) ? profile.emails.find((entry) => entry && entry.value) : null;
  return String(emailFromList?.value || profile._json?.mail || profile._json?.userPrincipalName || '').toLowerCase();
}

function configurePassport() {
  const configuredProviders = {
    google: false,
    microsoft: false,
  };

  const googleClientID = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/google/callback';

  if (googleClientID && googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientID,
          clientSecret: googleClientSecret,
          callbackURL: googleCallbackURL,
        },
        (_accessToken, _refreshToken, profile, done) => {
          const email = getPrimaryEmail(profile);

          if (!email || !isAllowedCampusEmail(email)) {
            return done(null, false, { message: 'Campus emails only.' });
          }

          const displayName = String(profile.displayName || profile._json?.name || email.split('@')[0]).trim();

          return done(null, {
            email,
            name: displayName,
            provider: 'google',
          });
        }
      )
    );
    configuredProviders.google = true;
  }

  const microsoftClientID = process.env.MICROSOFT_CLIENT_ID;
  const microsoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const microsoftCallbackURL = process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/microsoft/callback';

  if (microsoftClientID && microsoftClientSecret) {
    passport.use(
      new MicrosoftStrategy(
        {
          clientID: microsoftClientID,
          clientSecret: microsoftClientSecret,
          callbackURL: microsoftCallbackURL,
          scope: ['user.read'],
        },
        (_accessToken, _refreshToken, profile, done) => {
          const email = getPrimaryEmail(profile);

          if (!email || !isAllowedCampusEmail(email)) {
            return done(null, false, { message: 'Campus emails only.' });
          }

          const displayName = String(profile.displayName || profile._json?.displayName || email.split('@')[0]).trim();

          return done(null, {
            email,
            name: displayName,
            provider: 'microsoft',
          });
        }
      )
    );
    configuredProviders.microsoft = true;
  }

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  return configuredProviders;
}

module.exports = {
  passport,
  configurePassport,
};
