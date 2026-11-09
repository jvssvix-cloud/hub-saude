/**
 * Extrai um laudo e imprime o resultado normalizado.
 *   npm run extrair -- laudo.pdf
 *   npm run extrair -- foto_p1.jpg foto_p2.jpg      (várias fotos = um laudo, na ordem das páginas)
 *   npm run extrair -- laudo.pdf --sexo=M --nascimento=2006-02-10   (dados do cadastro)
 *   npm run extrair -- laudo.pdf --modelo=claude-opus-5-5 --esforco=high --saida=resultado.json
 */
import { exigirChave } from "./env";
import { readFileSync, writeFileSync } from "node:fs";
import { extrairDocumento, mimeDoArquivo, type Esforco } from "./extrair";

const args = process.argv.slice(2);
const opcao = (nome: string) => args.find((a) => a.startsWith(`--${nome}=`))?.split("=")[1];
const caminhos = args.filter((a) => !a.startsWith("--"));
if (caminhos.length === 0) {
  console.error("Uso: npm run extrair -- arquivo.pdf | foto1.jpg [foto2.jpg ...] [--esforco=medium] [--saida=x.json]");
  process.exit(1);
}
exigirChave();

const r = await extrairDocumento(
  caminhos.map((c) => ({ dados: readFileSync(c), mime: mimeDoArquivo(c) })),
  {
    esforco: (opcao("esforco") as Esforco) ?? "medium",
    modelo: opcao("modelo"),
    paciente: opcao("sexo") && opcao("nascimento")
      ? { sexo: opcao("sexo") as "M" | "F", nascimento: opcao("nascimento")! } : undefined,
  },
);

const saida = opcao("saida");
if (saida) writeFileSync(saida, JSON.stringify(r, null, 2));

const d = r.normalizado.documento;
console.log(`${d.laboratorio} | coleta ${d.data_coleta} | ${d.nome_paciente_impresso} | ${d.paginas} pág.`);
for (const x of r.normalizado.resultados) {
  const canon = x.valor_canonico === null ? "?" : `${x.valor_canonico} ${x.unidade_canonica}`;
  const flag = x.fora_da_faixa ? " *ALTERADO*" : "";
  const alerta = x.alertas.length ? `  ! ${x.alertas.join("; ")}` : "";
  console.log(`  [p${x.pagina}] ${x.nome_impresso}: ${x.valor_impresso} ${x.unidade_impressa} -> ${canon}${flag}${alerta}`);
}
if (r.normalizado.observacoes) console.log(`Observações: ${r.normalizado.observacoes}`);
console.log(`\n${r.modelo} | ${r.uso.entrada} tokens entrada, ${r.uso.saida} saída | ~US$ ${r.uso.custo_usd.toFixed(3)} | ${r.uso.segundos.toFixed(1)} s`);
if (!saida) console.log("(use --saida=arquivo.json para gravar o JSON completo)");
