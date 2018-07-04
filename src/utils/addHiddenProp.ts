export default function addHiddenProp(
  object: any,
  propName: PropertyKey,
  value: any
) {
  Object.defineProperty(object, propName, {
    enumerable: false,
    writable: true,
    configurable: true,
    value
  });
}
