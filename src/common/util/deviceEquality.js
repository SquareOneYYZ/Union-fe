const deviceEquality = (fields) => (previous = {}, next = {}) => {
  if (previous === next) return true;
  const previousIds = Object.keys(previous);
  if (previousIds.length !== Object.keys(next).length) return false;
  return previousIds.every((id) => {
    if (!next[id]) return false;
    return fields.every((field) => previous[id][field] === next[id][field]);
  });
};

export default deviceEquality;
