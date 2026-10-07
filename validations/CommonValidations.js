const { CustomError } = require("../middlewares/CustomeError");
const { checkIfIdExists, checkExists } = require("../models/checkIfExists");

const validateTenantIdAndPageAndLimit = async (tenantId, page,limit) => {

    await checkExists('tenant','tenant_id',tenantId)
      if(isNaN(page) || isNaN(limit)) throw new CustomError('Page and limit must be number',400)
  };

  module.exports={validateTenantIdAndPageAndLimit}