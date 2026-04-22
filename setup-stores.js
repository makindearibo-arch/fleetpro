// ============================================
// FleetPro Store Setup Script
// Run once: node setup-stores.js
// Creates all store locations + staff accounts
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bddmsrbfygbuyfdpieyl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG1zcmJmeWdidXlmZHBpZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDAzNzQsImV4cCI6MjA4Nzg3NjM3NH0.K3fpzvO31F7SylOedGJOW6qeb6_4D5KfQmXOW3xFYF8';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// ALL STORE LOCATIONS + CREDENTIALS
// ============================================
const stores = [
  // Bakery locations
  { location: "Akure Bakery",    email: "Akure.Bakery@Micmakin.com",    password: "Xom32015" },
  { location: "Ondo Bakery",     email: "Ondo.Bakery@Micmakin.com",     password: "Jur31690" },
  { location: "Owo Bakery",      email: "Owo.Bakery@Micmakin.com",      password: "Tul85742" },
  { location: "Ado Bakery",      email: "Ado.Bakery@Micmakin.com",      password: "Sas19498" },
  { location: "Oye Bakery",      email: "Oye.Bakery@Micmakin.com",      password: "Fod17264" },
  { location: "Ikare Bakery",    email: "Ikare.Bakery@Micmakin.com",    password: "Gut74767" },
  { location: "Okitipupa Bakery",email: "Okitipupa.Bakery@Micmakin.com",password: "Pur88567" },

  // Chicken Republic locations
  { location: "Akure 1",      email: "Akure1.CR@Micmakin.com",    password: "Fup49799" },
  { location: "Akure 2",      email: "Akure2.CR@Micmakin.com",    password: "Zuj28882" },
  { location: "Akure 3",      email: "Akure3.CR@Micmakin.com",    password: "Wom53223" },
  { location: "Akure 4",      email: "Akure4.CR@Micmakin.com",    password: "Yaj52937" },
  { location: "Akure 5",      email: "Akure5.CR@Micmakin.com",    password: "Nul21247" },
  { location: "Akure 6",      email: "Akure6.CR@Micmakin.com",    password: "Gur93446" },
  { location: "Owo CR",       email: "Owo.CR@Micmakin.com",       password: "Coy77688" },
  { location: "Ondo CR",      email: "Ondo.CR@Micmakin.com",      password: "Kaw65244" },
  { location: "Ado 1",        email: "Ado1.CR@Micmakin.com",      password: "Vul99371" },
  { location: "Ado 2",        email: "Ado2.CR@Micmakin.com",      password: "Yaf27310" },
  { location: "Ado 3",        email: "Ado3.CR@Micmakin.com",      password: "Tuc31329" },
  { location: "Ikare CR",     email: "Ikare.CR@Micmakin.com",     password: "Cov71537" },
  { location: "Akungba CR",   email: "Akungba.CR@Micmakin.com",   password: "V(883695580063az" },
  { location: "Okitipupa CR", email: "Okitipupa.CR@Micmakin.com", password: "Cok43723" },
  { location: "Igbokoda CR",  email: "Igbokoda.CR@Micmakin.com",  password: "Boj41240" },
  { location: "Idanre CR",    email: "Idanre.CR@Micmakin.com",    password: "ISaln420" },
  { location: "Ondo 2 CR",    email: "Ondo2.CR@Micmakin.com",     password: "IOrmz570" },
];

async function setup() {
  console.log("============================================");
  console.log("  FleetPro Store Setup");
  console.log("============================================\n");

  // Step 1: Clear old locations and add new ones
  console.log("[1/3] Setting up locations...");

  // Delete all existing locations
  const { error: delErr } = await supabase.from('locations').delete().neq('name', '___never_match___');
  if (delErr) console.log("  Warning clearing locations:", delErr.message);
  else console.log("  Cleared old locations.");

  // Add all new locations
  const locationRows = stores.map(s => ({ name: s.location }));
  const { error: locErr } = await supabase.from('locations').insert(locationRows);
  if (locErr) console.log("  Error adding locations:", locErr.message);
  else console.log(`  Added ${stores.length} store locations.`);

  // Step 2: Create user accounts
  console.log("\n[2/3] Creating store staff accounts...");

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const store of stores) {
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: store.email,
        password: store.password,
        options: { data: { name: store.location, role: "Store Staff" } }
      });

      if (error) {
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          console.log(`  SKIP: ${store.email} (already exists)`);
          skipped++;
          // Still update their profile with store_location
          const { data: existingUsers } = await supabase.from('profiles').select('id').eq('email', store.email).maybeSingle();
          if (existingUsers) {
            await supabase.from('profiles').update({
              role: "Store Staff",
              store_location: store.location
            }).eq('id', existingUsers.id);
            console.log(`         Updated profile for ${store.location}`);
          }
        } else {
          console.log(`  FAIL: ${store.email} - ${error.message}`);
          failed++;
        }
        continue;
      }

      // Create/update profile
      if (data.user) {
        const avatar = store.location.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const { error: profErr } = await supabase.from('profiles').upsert({
          id: data.user.id,
          name: store.location,
          email: store.email,
          role: "Store Staff",
          store_location: store.location,
          avatar: avatar
        });
        if (profErr) {
          console.log(`  WARN: Account created for ${store.email} but profile failed: ${profErr.message}`);
        } else {
          console.log(`  OK:   ${store.location} -> ${store.email}`);
        }
        created++;
      }
    } catch (e) {
      console.log(`  FAIL: ${store.email} - ${e.message}`);
      failed++;
    }
  }

  // Step 3: Summary
  console.log("\n[3/3] Summary");
  console.log("============================================");
  console.log(`  Locations added:  ${stores.length}`);
  console.log(`  Accounts created: ${created}`);
  console.log(`  Accounts skipped: ${skipped} (already existed)`);
  console.log(`  Accounts failed:  ${failed}`);
  console.log("============================================");
  console.log("\nDone! Store staff can now log in to FleetPro.");
  console.log("Each account is assigned the 'Store Staff' role");
  console.log("and linked to their store location.\n");

  // Sign out so we don't leave a session hanging
  await supabase.auth.signOut();
}

setup().catch(e => {
  console.error("Setup failed:", e);
  process.exit(1);
});
