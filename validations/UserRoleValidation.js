const Joi = require("joi");

const userRoleSchema = Joi.object({
    user_id: Joi.number()
        .integer()
        .positive()
        .required(),

    role_id: Joi.number()
        .integer()
        .positive()
        .required(),

    tenant_id: Joi.number()
        .integer()
        .positive()
        .required(),

    clinic_id: Joi.number()
        .integer()
        .positive()
        .required(),

    is_primary: Joi.number()
        .integer()
        .valid(0, 1)
        .default(0),

    status: Joi.number()
        .integer()
        .valid(0, 1)
        .default(1),

    created_by: Joi.string()
        .max(100)
        .allow(null, "")
        .default("SYSTEM"),

    updated_by: Joi.string()
        .max(100)
        .allow(null, "")
        .default("SYSTEM")
});

const updateUserRoleSchema = Joi.object({
    role_id: Joi.number()
        .integer()
        .positive()
        .required(),

    tenant_id: Joi.number()
        .integer()
        .positive()
        .required(),

    clinic_id: Joi.number()
        .integer()
        .positive()
        .required(),

    is_primary: Joi.number()
        .integer()
        .valid(0, 1)
        .default(0),

    status: Joi.number()
        .integer()
        .valid(0, 1)
        .default(1),

    updated_by: Joi.string()
        .max(100)
        .allow(null, "")
        .default("SYSTEM")
});

const updateUserRoleStatusSchema = Joi.object({
    status: Joi.number()
        .integer()
        .valid(0, 1)
        .required(),

    updated_by: Joi.string()
        .max(100)
        .allow(null, "")
        .default("SYSTEM")
});

module.exports = {
    userRoleSchema,
    updateUserRoleSchema,
    updateUserRoleStatusSchema
};
