import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { User } from "../model/user.model.js";
import dotenv from "dotenv";
dotenv.config();

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const githubId = profile.id;
        const name = profile.displayName || profile.username;
        const email = profile.emails?.[0]?.value || null;
        const oauthImage = profile.photos?.[0]?.value || null;

        // 🔍 1. Check if user exists
        let user = await User.findOne({ githubId });

        // 🆕 2. If not → create
        if (!user) {
          user = await User.create({
            name,
            email,
            oauthImage,
            githubId,
            isVerified: true, // OAuth users are trusted
          });
        }

        return done(null, user);

      } catch (err) {
        return done(err, null);
      }
    }
  )
);