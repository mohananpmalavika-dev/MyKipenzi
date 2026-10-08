export const PIN_ITERATIONS = 310000;
export function encode(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
export function decode(value) { return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), char => char.charCodeAt(0)); }
export async function pinRecord(pin) {
  if (!/^\d{6}$/.test(pin)) throw new Error('Use a 6-digit PIN.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin,salt);
  return {salt:encode(salt),hash:encode(hash),iterations:PIN_ITERATIONS};
}
async function derive(pin,salt) {
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
  return crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:PIN_ITERATIONS},key,256);
}
export async function matchesPin(pin,record) {
  if (!/^\d{6}$/.test(pin) || record.iterations !== PIN_ITERATIONS) return false;
  const actual = new Uint8Array(await derive(pin,decode(record.salt))), expected = decode(record.hash);
  let mismatch = actual.length ^ expected.length;
  for (let index=0;index<actual.length;index++) mismatch |= actual[index] ^ expected[index];
  return mismatch === 0;
}
export function failedAttempt(record,now=Date.now()) {
  const failures=(record.failures || 0)+1;
  return {...record,failures,retryAt:failures < 5 ? 0 : now + Math.min(300000,30000 * 2 ** Math.min(4,failures-5))};
}
function checkClient(response,challenge,type,origin) {
  const data=JSON.parse(new TextDecoder().decode(response.clientDataJSON));
  if (data.type!==type || data.challenge!==encode(challenge) || data.origin!==origin || data.crossOrigin) throw new Error('Device verification failed. Use your PIN.');
}
async function checkAuthenticator(bytes,rpId) {
  const data=new Uint8Array(bytes), hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(rpId)));
  if (data.length<37 || !(data[32]&1) || !(data[32]&4) || hash.some((byte,index)=>byte!==data[index])) throw new Error('Device verification failed. Use your PIN.');
}
export async function registerDevice(user) {
  const challenge=crypto.getRandomValues(new Uint8Array(32));
  const credential=await navigator.credentials.create({publicKey:{challenge,rp:{name:'Kipenzi Connect',id:location.hostname},user:{id:new TextEncoder().encode(user.id),name:user.handle,displayName:user.name},pubKeyCredParams:[{type:'public-key',alg:-7}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},attestation:'none',timeout:60000}});
  if (!credential || !credential.response.getPublicKey || credential.response.getPublicKeyAlgorithm()!==-7) throw new Error('This device cannot enable biometric unlock. Use your PIN.');
  checkClient(credential.response,challenge,'webauthn.create',location.origin);
  await checkAuthenticator(credential.response.getAuthenticatorData(),location.hostname);
  const publicKey=credential.response.getPublicKey();
  if (!publicKey) throw new Error('Device key unavailable. Use your PIN.');
  return {id:encode(credential.rawId),publicKey:encode(publicKey)};
}
// WebAuthn ES256 signatures are DER integers; WebCrypto expects 32-byte r and s.
export function rawSignature(signature) {
  const bytes=new Uint8Array(signature);
  if (bytes[0]!==48 || bytes[1]!==bytes.length-2) throw new Error('Invalid device signature.');
  const result=new Uint8Array(64); let offset=2;
  for (let part=0;part<2;part++) {
    if (bytes[offset++]!==2) throw new Error('Invalid device signature.');
    const length=bytes[offset++];
    let value=bytes.slice(offset,offset+length); offset+=length;
    if (value[0]===0) value=value.slice(1);
    if (!value.length || value.length>32) throw new Error('Invalid device signature.');
    result.set(value,part*32+32-value.length);
  }
  if (offset!==bytes.length) throw new Error('Invalid device signature.');
  return result;
}
export async function verifyDeviceAssertion(credential,record,challenge,origin,rpId) {
  if (!credential || encode(credential.rawId)!==record.id) throw new Error('Device key does not match. Use your PIN.');
  checkClient(credential.response,challenge,'webauthn.get',origin);
  await checkAuthenticator(credential.response.authenticatorData,rpId);
  const clientHash=new Uint8Array(await crypto.subtle.digest('SHA-256',credential.response.clientDataJSON));
  const auth=new Uint8Array(credential.response.authenticatorData), data=new Uint8Array(auth.length+clientHash.length);
  data.set(auth);data.set(clientHash,auth.length);
  const key=await crypto.subtle.importKey('spki',decode(record.publicKey),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  if (!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,rawSignature(credential.response.signature),data)) throw new Error('Device signature did not verify. Use your PIN.');
}
export async function unlockDevice(record) {
  const challenge=crypto.getRandomValues(new Uint8Array(32));
  const credential=await navigator.credentials.get({publicKey:{challenge,rpId:location.hostname,allowCredentials:[{type:'public-key',id:decode(record.id),transports:['internal']}],userVerification:'required',timeout:60000}});
  await verifyDeviceAssertion(credential,record,challenge,location.origin,location.hostname);
}

export async function deviceAvailable() {
  if (!globalThis.isSecureContext || !globalThis.PublicKeyCredential || !navigator.credentials?.create || !navigator.credentials?.get) return false;
  try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; }
}
