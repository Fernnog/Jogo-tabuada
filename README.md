# Jogo da Tabuada ✖️🎈

Um jogo web divertido e interativo criado para ajudar crianças (e adultos!) a praticar a tabuada de multiplicação de forma dinâmica e engajadora.

➡️ **Jogar Agora:** [**https://fernnog.github.io/Jogo-tabuada/**](https://fernnog.github.io/Jogo-tabuada/)

![Screenshot do Jogo](placeholder.png)
*(Substitua `placeholder.png` por um link atualizado de uma imagem ou GIF do seu jogo mostrando o novo visual com solo e coelhos!)*

## 🎮 Como Jogar

1.  **Acesse o link do jogo** acima.
2.  Um balão com uma conta de multiplicação (Ex: `3 x 5 = ?`) começará a cair.
3.  Use o **teclado numérico na tela** para digitar a resposta correta.
4.  Pressione o botão **➜** (Enter) para confirmar sua resposta.
5.  **Acerte antes que o balão caia** completamente para ganhar pontos e avançar!
6.  Respostas erradas ou deixar o balão cair custam uma vida (❤️). O jogo acaba se você perder todas as vidas.
7.  Durante o jogo, **power-ups** podem aparecer. Acerte a conta enquanto eles estão na tela para coletá-los:
    *   ⭐ **Estrela:** Permite usar o botão "Usar ⭐" para responder corretamente de forma automática.
    *   ⏳ **Ampulheta:** Deixa o *próximo* balão mais lento.
    *   ⚡ **Raio:** Concede o *dobro* de pontos pela resposta correta.
8.  Complete todas as tabuadas (do 2 ao 9, até x10) para vencer!
9.  *Observação:* Os efeitos sonoros agora são ativados automaticamente após sua primeira interação com o jogo (como clicar num botão do teclado virtual), devido às políticas dos navegadores.

## ✨ Funcionalidades

*   Prática interativa das **tabuadas do 2 ao 9**.
*   Interface visual amigável com **balões caindo**, nuvens, sol, **solo, arbustos e coelhos decorativos**.
*   Sistema de **Vidas** (❤️).
*   **Pontuação** (🌟 Score) e salvamento do **Recorde** (🏆 High Score) no navegador.
*   **Power-ups** colecionáveis (⭐, ⏳, ⚡).
*   Feedback visual e sonoro para acertos e erros.
*   Animações CSS para dar vida ao jogo.
*   Sistema de **Conquistas** (Achievements 🏆) desbloqueáveis.
*   Design adaptável para diferentes tamanhos de tela (foco mobile).
*   Carregamento e ativação automática de **Efeitos Sonoros** via Web Audio API (requer interação inicial do usuário).

## 💻 Tecnologias Utilizadas

*   **HTML5:** Estrutura da página.
*   **CSS3:** Estilização, layout (Flexbox), animações e variáveis CSS.
*   **JavaScript (Vanilla JS):** Toda a lógica do jogo, manipulação do DOM, controle de estado e interações.
*   **Web Audio API:** Para carregamento e reprodução dos efeitos sonoros.
*   **SVG:** Para imagens vetoriais (coelhos).
*   **GitHub Pages:** Para hospedagem e disponibilização online do jogo.

## 🚀 Executando Localmente

Embora seja possível baixar os arquivos (HTML, CSS, JS, MP3, **SVG**) e abrir o `index.html` localmente em seu navegador, a funcionalidade completa dos **efeitos sonoros pode não funcionar corretamente**. Isso ocorre devido às restrições de segurança do navegador (`file:///`) que afetam a inicialização da Web Audio API e o carregamento de recursos interativos. Além disso, os arquivos de som são carregados diretamente das URLs do GitHub Pages no código atual, o que não funcionará offline.

**A forma recomendada e mais confiável de jogar é acessando o link online fornecido no topo deste README.**

## 👤 Autor

Criado por [@fernnog](https://github.com/fernnog)
