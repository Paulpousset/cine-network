-- Create the location_categories table
CREATE TABLE IF NOT EXISTS public.location_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.location_categories ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read categories
CREATE POLICY "Allow public read access"
ON public.location_categories FOR SELECT
TO authenticated, anon
USING (true);

-- Allow authenticated users to insert new categories
CREATE POLICY "Allow authenticated insert"
ON public.location_categories FOR INSERT
TO authenticated
WITH CHECK (true);

-- Populate with initial categories from LOCATION_CATEGORIES
INSERT INTO public.location_categories (name)
VALUES 
('Abattoir'), ('Abri De Jardin'), ('Abri Bus'), ('Aéroport'), ('Ambassade'), ('Antenne Relais'), ('Appartement'), 
('Ascenseur'), ('Atelier'), ('Autoroute'), ('Avion'), ('Banque'), ('Bar'), ('Barrage'), ('Base Militaire'), 
('Bateau'), ('Bibliothèque'), ('Boîte De Nuit'), ('Boutique'), ('Bureau'), ('Cabinet Dentaire'), 
('Cabinet Médical'), ('Café'), ('Camping'), ('Carrière'), ('Cascade'), ('Casino'), ('Cave'), 
('Centrale Électrique'), ('Champ'), ('Chantier'), ('Château'), ('Château D''eau'), ('Cimetière'), 
('Cinéma'), ('Cirque'), ('Commissariat'), ('Cuisine Professionnelle'), ('Décharge'), ('Désert'),

('École'), ('Écurie'), ('Église'), ('Entrepôt'), ('Espace Futuriste'), ('Escalier'), ('Ferme'), 
('Forêt'), ('Galerie D''art'), ('Garage'), ('Garage Automobile'), ('Gare'), ('Golf'), ('Grange'), ('Grenier'), ('Grotte'), ('Gymnase'), 
('Hangar'), ('Hélicoptère'), ('Hôpital'), ('Hôtel'), ('Installation Sportive'), ('Institut De Beauté'), ('Jardin'), 
('Laboratoire'), ('Lac'), ('Laverie Automatique'), ('Lavoir'), ('Lieu Historique'), ('Loft'), ('Mairie'), ('Maison'), ('Manoir'), 
('Marché Couvert'), ('Métro'), ('Montagne'), ('Moulin'), ('Musée'), ('Observatoire'), ('Parc'), ('Parc D''attraction'), ('Parking'), 
('Pépinière'), ('Périmètre Industriel'), ('Pharmacie'), ('Phare'), ('Piscine'), ('Place'), ('Plage'), ('Plateforme Pétrolière'), 
('Pont'), ('Port'), ('Potager'), ('Prison'), ('Restaurant'), ('Rivière'), ('Route De Campagne'), ('Rue'), ('Ruines'), 
('Salle De Spectacle'), ('Salon De Coiffure'), ('Sauna / Spa'), ('Serre'), ('Stade'), ('Station-Service'), 
('Studio'), ('Supermarché'), ('Terrain De Tennis'), ('Théâtre'), ('Toit-Terrasse (Rooftop)'), ('Train'), ('Tribunal'), ('Tunnel'), 
('Usine'), ('Verger'), ('Vignoble'), ('Village'), ('Zoo')
ON CONFLICT (name) DO NOTHING;
