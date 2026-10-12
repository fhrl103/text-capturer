export function fitWithin(width, height, maxEdge) {
  var longest = Math.max(width, height);
  if (longest <= maxEdge) return { width: width, height: height };
  var scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}
