const DATABASE='kipenzi-app-lock';
export async function lockStore(userId,value) {
  return new Promise((resolve,reject) => {
    const request=indexedDB.open(DATABASE,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('settings');
    request.onerror=()=>reject(new Error('App lock storage is unavailable. Allow browser storage and retry.'));
    request.onblocked=()=>reject(new Error('Close other Kipenzi tabs and retry.'));
    request.onsuccess=()=>{
      const database=request.result;
      const writing=value!==undefined;
      const transaction=database.transaction('settings',writing?'readwrite':'readonly');
      const store=transaction.objectStore('settings');
      const operation=writing ? value===null ? store.delete(userId) : store.put(value,userId) : store.get(userId);
      transaction.oncomplete=()=>{database.close();resolve(writing?value:operation.result || null);};
      transaction.onerror=transaction.onabort=()=>{database.close();reject(new Error('Could not save app lock. Please retry.'));};
    };
  });
}
