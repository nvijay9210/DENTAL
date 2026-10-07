function flattenArrayField(obj, fieldName) {
    const result = { ...obj };
    const flat = {};
  
    if (Array.isArray(result[fieldName])) {
      result[fieldName].forEach((item, index) => {
        flat[`${fieldName}_${index}`] = item.image || "";
        if(fieldName==='awards_certifications'){
            flat[`description_${fieldName}_${index}`] = item.description || "";
        }
        
      });
    }
  
    delete result[fieldName];
  
    return {
      ...result,
      ...flat
    };
  }