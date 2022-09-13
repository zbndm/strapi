module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', '0ba9d4d40d9477ba87f57e91cc5826b5'),
  },
});
