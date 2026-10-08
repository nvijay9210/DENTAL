const userQuery = {
  createUser: `
    INSERT INTO users (
      keycloak_id,
      username,
      email,
      status,
      created_by
    )
    VALUES (?, ?, ?, ?, ?)
  `,

  getAllUsers: `
    SELECT
      user_id,
      keycloak_id,
      username,
      email,
      status,
      last_login,
      created_by,
      created_time,
      updated_by,
      updated_time
    FROM users
    ORDER BY user_id DESC
  `,

  getUserById: `
    SELECT
      user_id,
      keycloak_id,
      username,
      email,
      status,
      last_login,
      created_by,
      created_time,
      updated_by,
      updated_time
    FROM users
    WHERE user_id = ?
    LIMIT 1
  `,

  getUserByKeycloakId: `
    SELECT
      user_id,
      keycloak_id,
      username,
      email,
      status,
      last_login,
      created_by,
      created_time,
      updated_by,
      updated_time
    FROM users
    WHERE keycloak_id = ?
    LIMIT 1
  `,

  checkKeycloakIdExists: `
    SELECT 1
    FROM users
    WHERE keycloak_id = ?
    LIMIT 1
  `,

  checkUsernameExists: `
    SELECT 1
    FROM users
    WHERE username = ?
    LIMIT 1
  `,

  checkUsernameExistsExcludeUser: `
    SELECT 1
    FROM users
    WHERE username = ?
      AND user_id != ?
    LIMIT 1
  `,

  checkEmailExists: `
    SELECT 1
    FROM users
    WHERE email = ?
    LIMIT 1
  `,

  checkEmailExistsExcludeUser: `
    SELECT 1
    FROM users
    WHERE email = ?
      AND user_id != ?
    LIMIT 1
  `,

  updateUser: `
    UPDATE users
    SET
      username = ?,
      email = ?,
      status = ?,
      updated_by = ?,
      updated_time = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `,

  updateUserStatus: `
    UPDATE users
    SET
      status = ?,
      updated_by = ?,
      updated_time = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `,

  deleteUser: `
    DELETE FROM users
    WHERE user_id = ?
  `,
};

module.exports = {
  userQuery,
};