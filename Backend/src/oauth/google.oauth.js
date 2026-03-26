import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../model/user.model.js";
import dotenv from "dotenv";
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 🔥 Extract data
        const googleId = profile.id;
        const name = profile.displayName;
        const email = profile.emails?.[0]?.value || null;
        const oauthImage = profile.photos?.[0]?.value || null;

        // 🔍 1. Check if user exists with googleId
        let user = await User.findOne({ googleId });

        // 🧠 2. If not found → try linking with existing email
        if (!user && email) {
          user = await User.findOne({ email });

          if (user) {
            // 🔗 link Google account
            user.googleId = googleId;
            await user.save({ validateBeforeSave: false });
          }
        }

        // 🆕 3. If still not found → create new user
        if (!user) {
          user = await User.create({
            name,
            email,
            oauthImage,
            googleId,
            isVerified: true, // OAuth users trusted
          });
        }

        // ✅ 4. Done
        return done(null, user);

      } catch (err) {
        return done(err, null);
      }
    }
  )
);