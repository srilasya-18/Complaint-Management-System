// backend/graphql/resolvers/auth.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/user.js';
import College from '../../models/college.js';
import { errorNames } from '../../helpers/errorConstants.js';

export default {
  createUser: async args => {
    try {
      const existingUser = await User.findOne({
        $or: [
          { email: args.userInput.email },
          { identification_num: args.userInput.identification_num }
        ]
      });
      if (existingUser) {
        throw new Error(errorNames.USER_ALREADY_EXISTS);
      }

      const emailDomain = args.userInput.email.split('@')[1];
      const college = await College.findOne({ emailDomain, isActive: true });
      if (!college) {
        throw new Error(errorNames.COLLEGE_NOT_FOUND);
      }

      const hashedPassword = await bcrypt.hash(args.userInput.password, 12);

      const user = new User({
        name: args.userInput.name,
        identification_num: args.userInput.identification_num,
        email: args.userInput.email,
        password: hashedPassword,
        role: 'student',
        college: college._id,
        createdAt: new Date()
      });

      const result = await user.save();
      return {
        _id: result.id,
        name: result._doc.name,
        identification_num: result._doc.identification_num,
        email: result._doc.email
      };
    } catch (err) {
      throw err;
    }
  },

  login: async (args, req) => {
    try {
      const user = await User.findOne({
        identification_num: args.logInput.identification_num,
        isActive: true
      }).populate('college');

      if (!user) {
        throw new Error(errorNames.INNCORRECT_ACCOUNT);
      }

      const isEqual = await bcrypt.compare(args.logInput.password, user.password);
      if (!isEqual) {
        throw new Error(errorNames.INNCORRECT_PASSWORD);
      }

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          identification_num: user.identification_num,
          role: user.role,
          college: user.college?._id?.toString() || null
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1h' }
      );

      req.res.cookie('secretToken', token, {
      maxAge: parseInt(process.env.COOKIE_MAX_AGE),
      httpOnly: false,
      sameSite: 'lax',
      path: '/'
      });

      return {
        userId: user.id,
        role: user.role,
        college: user.college?._id?.toString() || null,
        token
      };
    } catch (err) {
      throw err;
    }
  },

  createCollege: async (args, req) => {
    if (!req.isAuth || req.userRole !== 'super_admin') {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    try {
      const existing = await College.findOne({ emailDomain: args.collegeInput.emailDomain });
      if (existing) {
        throw new Error(errorNames.COLLEGE_ALREADY_EXISTS);
      }
      const college = new College({
        name: args.collegeInput.name,
        emailDomain: args.collegeInput.emailDomain.toLowerCase(),
        code: args.collegeInput.code.toUpperCase(),
        location: args.collegeInput.location || null,
        createdAt: new Date()
      });
      const result = await college.save();
      return result;
    } catch (err) {
      throw err;
    }
  },

  createCollegeAdmin: async (args, req) => {
    if (!req.isAuth || req.userRole !== 'super_admin') {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    try {
      const college = await College.findById(args.collegeId);
      if (!college) throw new Error(errorNames.COLLEGE_NOT_FOUND);

      const existingUser = await User.findOne({
        $or: [
          { email: args.userInput.email },
          { identification_num: args.userInput.identification_num }
        ]
      });
      if (existingUser) throw new Error(errorNames.USER_ALREADY_EXISTS);

      const hashedPassword = await bcrypt.hash(args.userInput.password, 12);
      const admin = new User({
        name: args.userInput.name,
        identification_num: args.userInput.identification_num,
        email: args.userInput.email,
        password: hashedPassword,
        role: 'college_admin',
        college: college._id,
        createdAt: new Date()
      });
      const result = await admin.save();
      return {
        _id: result.id,
        name: result._doc.name,
        identification_num: result._doc.identification_num,
        email: result._doc.email
      };
    } catch (err) {
      throw err;
    }
  },

  toggleCollegeStatus: async ({ collegeId }, req) => {
    if (!req.isAuth || req.userRole !== 'super_admin') {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    try {
      const college = await College.findById(collegeId);
      if (!college) throw new Error(errorNames.COLLEGE_NOT_FOUND);
      college.isActive = !college.isActive;
      return await college.save();
    } catch (err) {
      throw err;
    }
  },

  toggleUserStatus: async ({ userId }, req) => {
    if (!req.isAuth || req.userRole !== 'super_admin') {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error(errorNames.INNCORRECT_ACCOUNT);
      user.isActive = !user.isActive;
      await user.save();
      return user.toSafeObject();
    } catch (err) {
      throw err;
    }
  },

  listColleges: async (args, req) => {
    if (!req.isAuth || req.userRole !== 'super_admin') {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    return await College.find({});
  },

  listCollegeAdmins: async ({ collegeId }, req) => {
    if (!req.isAuth || req.userRole !== 'super_admin') {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    const filter = { role: 'college_admin' };
    if (collegeId) filter.college = collegeId;
    return await User.find(filter).populate('college');
  },

  // ── create super admin via secret code ────────────────────────────
  createSuperAdmin: async (args) => {
    if (args.secretCode !== process.env.SUPER_ADMIN_CODE) {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    const existing = await User.findOne({
      $or: [
        { email: args.userInput.email },
        { identification_num: args.userInput.identification_num }
      ]
    });
    if (existing) throw new Error(errorNames.USER_ALREADY_EXISTS);

    const hashedPassword = await bcrypt.hash(args.userInput.password, 12);
    const admin = new User({
      name: args.userInput.name,
      identification_num: args.userInput.identification_num,
      email: args.userInput.email,
      password: hashedPassword,
      role: 'super_admin',
      college: null,
      isActive: true,
      isVerified: true,
      createdAt: new Date()
    });
    const result = await admin.save();
    return { _id: result.id, name: result._doc.name };
  }
};