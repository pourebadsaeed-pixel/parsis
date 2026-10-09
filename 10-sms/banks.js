export const BANKS = [
  { id:'melli',      name:'ملی',          aliases:['بانک ملی','ملی ایران'] },
  { id:'saderat',    name:'صادرات',       aliases:['بانک صادرات','صادرات ایران'] },
  { id:'tejarat',    name:'تجارت',        aliases:['بانک تجارت'] },
  { id:'mellat',     name:'ملت',          aliases:['بانک ملت'] },
  { id:'parsian',    name:'پارسیان',      aliases:['بانک پارسیان'] },
  { id:'pasargad',   name:'پاسارگاد',     aliases:['بانک پاسارگاد','پاسارگاد'] },
  { id:'saman',      name:'سامان',        aliases:['بانک سامان','سامان'] },
  { id:'sepah',      name:'سپه',          aliases:['بانک سپه'] },
  { id:'refah',      name:'رفاه',         aliases:['بانک رفاه'] },
  { id:'keshavarzi', name:'کشاورزی',      aliases:['بانک کشاورزی'] },
  { id:'maskan',     name:'مسکن',         aliases:['بانک مسکن'] },
  { id:'shahr',      name:'شهر',          aliases:['بانک شهر'] },
  { id:'ayandeh',    name:'آینده',        aliases:['بانک آینده'] },
  { id:'dey',        name:'دی',           aliases:['بانک دی'] },
  { id:'sina',       name:'سینا',         aliases:['بانک سینا'] },
  { id:'en',         name:'اقتصاد نوین',  aliases:['اقتصاد نوین'] },
  { id:'blu',        name:'بلوبانک',      aliases:['بلو','blu'] },
  { id:'resalat',    name:'رسالت',        aliases:['بانک رسالت'] },
  { id:'mehr',       name:'مهر ایران',    aliases:['مهر ایران','قرض الحسنه مهر'] },
  // ... هر بانکی که نیاز داشتید اضافه کنید
];

export function detectBank(text) {
  for (const b of BANKS) {
    const names = [b.name, ...(b.aliases||[])];
    if (names.some(n => text.includes(n))) return b;
  }
  return null;
}
