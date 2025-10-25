#!/bin/bash

# Script per automatizzare il push dello schema al database
echo "Iniziando la migrazione del database..."

# Variabile per salvare la risposta
echo "create" > db_answers.txt

# Eseguiamo il comando e forniamo risposte automatiche
npm run db:push < db_answers.txt

echo "Migrazione completata."