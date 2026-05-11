QL query: Copy


-- Add sample events for testing
INSERT INTO events (title, description, date, time, location, max_attendees, price, is_free) VALUES
('TLA Annual Conference 2026', 'Join us for the biggest library and information professionals gathering in Tanzania. Features keynote speakers, workshops, and networking opportunities.', '2026-06-15', '09:00:00', 'Julius Nyerere International Convention Centre, Dar es Salaam', 500, 50000, FALSE),
('Digital Libraries Workshop', 'Hands-on workshop on implementing digital library systems. Learn about cataloging, digitization, and user experience design.', '2026-04-20', '14:00:00', 'TLA Training Center, Dar es Salaam', 30, 15000, FALSE),
('Information Literacy Training', 'Free training session on teaching information literacy skills. Perfect for librarians and educators.', '2026-05-10', '10:00:00', 'Online via Zoom', 100, 0, TRUE),
('Library Management Software Demo', 'Live demonstration of modern library management systems. Compare features and pricing.[...]
MySQL said: Documentation

#1054 - Unknown column 'date' in 'field list'
