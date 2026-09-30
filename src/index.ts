import app from "./server"
import { runLeagueChecks } from "./dashboard/ea_refresher"

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`server started on ${port}`);
});
runLeagueChecks().catch(e => console.error(`League check loop crashed: ${e}`))
