const url = 'https://ccvitwiriprmhzmwjivr.supabase.co/rest/v1/suppliers?select=*&limit=1';
const apikey = 'sb_publishable_aBdtc9DibvRkZ2QmKVMxFg_MZK_FRpf';

fetch(url, { headers: { 'apikey': apikey, 'Authorization': `Bearer ${apikey}` }})
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
