// Script de débogage pour vérifier les phases
const { createClient } = require('@supabase/supabase-js');

// Remplacez par votre URL et clé Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPhases() {
  console.log('🔍 Vérification des phases...');
  
  try {
    // Vérifier les phases
    const { data: phases, error: phasesError } = await supabase
      .from('phases')
      .select('*')
      .order('order_index');
    
    if (phasesError) {
      console.error('❌ Erreur phases:', phasesError);
    } else {
      console.log('✅ Phases trouvées:', phases?.length || 0);
      console.log('📋 Détail des phases:', phases);
    }

    // Vérifier les types de documents
    const { data: types, error: typesError } = await supabase
      .from('deliverable_types')
      .select('*')
      .order('phase_id');
    
    if (typesError) {
      console.error('❌ Erreur types:', typesError);
    } else {
      console.log('✅ Types de documents trouvés:', types?.length || 0);
      console.log('📋 Détail des types:', types);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

debugPhases();