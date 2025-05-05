function hasChanges(existing, data) {
    for (let key in data) {
      if (data[key] !== undefined && JSON.stringify(data[key]) !== JSON.stringify(existing[key])) {
        return true;
      }
    }
    return false;
  }
  module.exports = { hasChanges };
  