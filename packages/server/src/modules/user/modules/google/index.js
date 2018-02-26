import { pick } from 'lodash';
import passport from 'passport';
import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth';
import MobileDetect from 'mobile-detect';
import { createTokens } from '../jwt/auth';
import settings from '../../../../../../../settings';
import { updateSession } from '../session/auth';
import { encryptSession } from './../session/auth/crypto';

export function googleStategy(User) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: settings.user.auth.google.clientID,
        clientSecret: settings.user.auth.google.clientSecret,
        callbackURL: '/auth/google/callback'
      },
      async function(accessToken, refreshToken, profile, cb) {
        const { id, username, displayName, emails: [{ value }] } = profile;
        try {
          let user = await User.getUserByGoogleIdOrEmail(id, value);

          if (!user) {
            const isActive = true;
            const [createdUserId] = await User.register({
              username: username ? username : value,
              email: value,
              password: id,
              isActive
            });

            await User.createGoogleOuth({
              id,
              displayName,
              userId: createdUserId
            });

            await User.editUserProfile({
              id: createdUserId,
              profile: {
                firstName: profile.name.givenName,
                lastName: profile.name.familyName
              }
            });

            user = await User.getUser(createdUserId);
          } else if (!user.googleId) {
            await User.createGoogleOuth({
              id,
              displayName,
              userId: user.id
            });
          }

          return cb(null, pick(user, ['id', 'username', 'role', 'email']));
        } catch (err) {
          return cb(err, {});
        }
      }
    )
  );
}

export function googleAuth(module, app, SECRET, User) {
  app.use(passport.initialize());
  app.get(
    '/auth/google',
    passport.authenticate('google', {
      scope: settings.user.auth.google.scope
    })
  );

  app.get('/auth/google/callback', passport.authenticate('google', { session: false }), async function(req, res) {
    const user = await User.getUserWithPassword(req.user.id);
    const md = new MobileDetect(req.headers['user-agent']);
    const port = md.os() === 'iOS' ? '19500' : '19000';

    if (module === 'jwt') {
      const refreshSecret = SECRET + user.password;
      const [token, refreshToken] = await createTokens(req.user, SECRET, refreshSecret);
      req.universalCookies.set('x-token', token, {
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true
      });
      req.universalCookies.set('x-refresh-token', refreshToken, {
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true
      });

      req.universalCookies.set('r-token', token, {
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: false
      });
      req.universalCookies.set('r-refresh-token', refreshToken, {
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: false
      });
      if (['iOS', 'AndroidOS'].includes(md.os())) {
        res.redirect(
          `${settings.user.MOBILE_APP_URL}:${port}/+?data=` +
            JSON.stringify({
              tokens: { token: token, refreshToken: refreshToken }
            })
        );
      } else {
        res.redirect('/profile');
      }
    } else if (module === 'session') {
      if (req.user && req.user.id) {
        req.session.userId = req.user.id;
      }
      await updateSession(req, req.session);
      if (['iOS', 'AndroidOS'].includes(md.os())) {
        res.redirect(
          `${settings.user.MOBILE_APP_URL}:${port}/+?data=` +
            JSON.stringify({
              session: encryptSession(req.session)
            })
        );
      } else {
        res.redirect('/profile');
      }
    }

    //res.redirect('/profile');
  });
}