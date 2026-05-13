-- Insert profile for user_id 25 (Jafar Juma Jafar)
INSERT INTO user_profiles (
    user_id, 
    phone, 
    address, 
    city, 
    state, 
    postal_code, 
    country,
    job_title,
    company,
    industry,
    years_of_experience,
    skills,
    highest_degree,
    institution,
    field_of_study,
    year_of_graduation,
    additional_certifications,
    date_of_birth,
    gender,
    nationality,
    place_of_birth,
    personal_info,
    contact_info,
    education,
    employment,
    created_at,
    updated_at
) VALUES (
    25,                                    -- user_id
    '0626776318',                          -- phone (from users table)
    '123 Library Street',                     -- address
    'Dar es Salaam',                       -- city
    'Dar es Salaam',                       -- state
    '12345',                               -- postal_code
    'Tanzania',                            -- country
    'Librarian',                           -- job_title
    'National Library of Tanzania',          -- company
    'Education & Information Services',       -- industry
    5,                                     -- years_of_experience
    'Cataloging, Research, Digital Archives, Information Management', -- skills
    'Bachelor of Library Science',         -- highest_degree
    'University of Dar es Salaam',        -- institution
    'Library and Information Science',      -- field_of_study
    2018,                                  -- year_of_graduation
    'Professional Librarian Certification', -- additional_certifications
    '1990-01-01',                         -- date_of_birth
    'male',                                -- gender
    'Tanzanian',                           -- nationality
    'Dar es Salaam',                       -- place_of_birth
    '{"fullName":"Jafar Juma Jafar","name":"Jafar Juma Jafar","gender":"male","dateOfBirth":"1990-01-01","nationality":"Tanzanian"}', -- personal_info
    '{"phone":"0626776318","address":"123 Library Street","city":"Dar es Salaam","country":"Tanzania"}', -- contact_info
    '[{"highestDegree":"Bachelor of Library Science","institution":"University of Dar es Salaam","fieldOfStudy":"Library and Information Science","yearOfGraduation":"2018"}]', -- education
    '[{"jobTitle":"Librarian","company":"National Library of Tanzania","industry":"Education & Information Services","yearsOfExperience":"5"}]', -- employment
    NOW(),                                  -- created_at
    NOW()                                   -- updated_at
);
