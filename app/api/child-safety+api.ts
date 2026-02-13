export async function GET(request: Request) {
  return Response.json({
    question: "Qu'entendez-vous par \"exploitation et abus sexuels sur mineurs\" ?",
    answer: "Cela renvoie à des pratiques ou contenus conçus pour ou consistant à exploiter sexuellement les mineurs, à abuser d'eux ou à les mettre en danger (par exemple, la sollicitation d'enfants à des fins d'exploitation sexuelle, la sextorsion, le trafic ou toute autre forme d'exploitation sexuelle des enfants).",
    report_email: "support@titapp.fr",
    policy_url: "/protection-mineurs"
  });
}
