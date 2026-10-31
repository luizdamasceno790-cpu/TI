# Como colocar este projeto no repositório (passo a passo)

Esta pasta tem `backend/`, `frontend/`, `README.md` e `.gitignore`. Faça no PC de quem tem o repositório `TI` (Luiz).

1. Feche o servidor do Vite se estiver rodando (Ctrl + C no terminal).
2. Na pasta `TI`, **apague a pasta `frontend`** que o Vite criou (o `frontend` deste pacote é o completo).
3. Copie para dentro da pasta `TI`: as pastas `backend` e `frontend`, o `README.md` e o `.gitignore` (aceite substituir os dois arquivos).
4. No terminal do VS Code, dentro da pasta `TI`, confira que está na branch `feature/front-base`:  `git branch`
5. Envie tudo:
   ```
   git add .
   git commit -m "feat: sistema completo (api e telas)"
   git push -u origin feature/front-base
   ```
6. No GitHub, abra o pull request de `feature/front-base` para `develop` e faça o merge. Depois, o grupo faz `git checkout develop` e `git pull`.
7. Para rodar, siga o `README.md` (seção "Como rodar").
