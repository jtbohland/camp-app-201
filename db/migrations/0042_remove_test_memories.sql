-- Remove the placeholder/test posts from the Memories feed (in every environment).
-- Only exact known test content is matched, so real cAMPer posts are untouched.

-- Reactions on the test text memories
DELETE FROM camp201_memory_reactions
WHERE memory_id IN (
  SELECT id FROM camp201_memories
  WHERE content = 'Best week ever at cAMP! The hackathon was incredible.'
     OR content LIKE 'Testing the new memory points system%'
);

DELETE FROM camp201_memories
WHERE content = 'Best week ever at cAMP! The hackathon was incredible.'
   OR content LIKE 'Testing the new memory points system%';

-- Legacy gallery stock photos (Unsplash placeholders). Their reactions use the negative gallery id.
DELETE FROM camp201_memory_reactions
WHERE memory_id IN (
  SELECT -id FROM camp201_gallery WHERE image_url LIKE 'https://images.unsplash.com/%'
);

DELETE FROM camp201_gallery
WHERE image_url LIKE 'https://images.unsplash.com/%';
