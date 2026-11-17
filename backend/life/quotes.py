"""Paráfrasis originales. La referencia identifica el pasaje que las inspira."""
QUOTES = [
    dict(author='Marco Aurelio', work='Meditaciones', passage='II.1', text='Empieza el día dispuesto a colaborar, incluso cuando encuentres dificultades en los demás.', question='¿Con quién puedes practicar hoy la paciencia?', url='https://classics.mit.edu/Antoninus/meditations.2.two.html'),
    dict(author='Séneca', work='Cartas a Lucilio', passage='1.1–3', text='Cuida las horas de hoy. El tiempo que entregas merece una decisión consciente.', question='¿A qué quieres dedicar tu mejor atención?', url='https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1'),
    dict(author='Cicerón', work='Sobre los deberes', passage='I.22', text='Una parte de nuestra vida encuentra sentido en lo que aportamos a los demás.', question='¿Qué ayuda concreta puedes ofrecer hoy?', url='https://www.gutenberg.org/ebooks/47001'),
    dict(author='Marco Aurelio', work='Meditaciones', passage='IV.3', text='Puedes hacer una pausa y volver a examinar los juicios que agitan tu ánimo.', question='¿Qué juicio te conviene revisar antes de actuar?', url='https://classics.mit.edu/Antoninus/meditations.4.four.html'),
    dict(author='Séneca', work='Cartas a Lucilio', passage='13.4–5', text='Examina lo que temes y cuánto de ese temor nace de anticipar lo que aún no ocurre.', question='¿Qué sabes con certeza sobre lo que te preocupa?', url='https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_13'),
    dict(author='Cicerón', work='Sobre los deberes', passage='I.23', text='La confianza se sostiene cuando nuestros actos cumplen lo que nuestras palabras prometen.', question='¿Qué compromiso pequeño puedes cumplir hoy?', url='https://www.gutenberg.org/ebooks/47001'),
    dict(author='Marco Aurelio', work='Meditaciones', passage='V.1', text='Al comenzar la jornada, recuerda el trabajo humano que puedes hacer con tus capacidades.', question='¿Cuál es la primera acción que merece tu esfuerzo?', url='https://classics.mit.edu/Antoninus/meditations.5.five.html'),
    dict(author='Séneca', work='Cartas a Lucilio', passage='2.1–4', text='Permanece un momento con una idea valiosa y dale tiempo para transformar tu conducta.', question='¿Qué idea de esta semana quieres poner en práctica?', url='https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_2'),
    dict(author='Cicerón', work='Sobre los deberes', passage='I.110', text='Conoce tus capacidades y cultiva una forma de actuar coherente con ellas.', question='¿Qué fortaleza puedes ejercitar en tu trabajo de hoy?', url='https://www.gutenberg.org/ebooks/47001'),
    dict(author='Marco Aurelio', work='Meditaciones', passage='VIII.36', text='Vuelve a la tarea presente y atiende la dificultad que realmente tienes delante.', question='¿Qué parte de tu pendiente puedes resolver ahora?', url='https://classics.mit.edu/Antoninus/meditations.8.eight.html'),
    dict(author='Séneca', work='Cartas a Lucilio', passage='47.1', text='Trata con humanidad a quienes comparten tu día, cualquiera que sea su posición.', question='¿Cómo puedes expresar respeto en tu próxima conversación?', url='https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_47'),
    dict(author='Cicerón', work='Sobre los deberes', passage='I.160', text='El conocimiento cobra valor cuando orienta una acción justa y útil para la comunidad.', question='¿Cómo puedes aplicar algo que aprendiste para ayudar?', url='https://www.gutenberg.org/ebooks/47001'),
]


def daily_quote(date):
    return {**QUOTES[date.toordinal() % len(QUOTES)], 'kind': 'Paráfrasis', 'date': date.isoformat()}
