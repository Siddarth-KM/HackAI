import asyncio
import json
import time
from app.services.gemini import extract_signal

# Mapping from test doc sectors to GICS sectors
SECTOR_MAP = {
    "Energy": ["Energy"],
    "Technology": ["Information Technology"],
    "Financial": ["Financials"],
    "Healthcare": ["Health Care"],
    "Consumer": ["Consumer Discretionary", "Consumer Staples"],
    "Industrials": ["Industrials"],
    "Real Estate": ["Real Estate"],
    "Airlines": ["Industrials", "Consumer Discretionary"],
    "Mining": ["Materials"],
    "Utilities": ["Utilities"],
    "Telecom": ["Communication Services"],
    "Semiconductors": ["Information Technology"],
    "Agriculture": ["Consumer Staples", "Materials"],
    "Logistics": ["Industrials"],
    "Media": ["Communication Services"],
    "Biotech": ["Health Care"],
}

# Direction mapping
DIRECTION_MAP = {
    "Bullish": "long",
    "Bearish": "short",
}

TEST_CASES = [
    # Energy
    (1, "Energy", "Bearish", 'A senior drilling operations executive at a major oil company was overheard at an industry conference saying he hasn\'t seen rig utilization this poor in years. "We\'re basically spinning our wheels out there," he told a colleague. "The new field just isn\'t producing what the models said it would, and leadership is already asking questions."'),
    (2, "Energy", "Bearish", 'Internal communications from a Gulf Coast refinery suggest that a planned capacity expansion has been quietly shelved after cost overruns exceeded projections by more than 40%. The memo, shared among mid-level managers, references growing tension between the CFO\'s office and the operations division.'),
    (3, "Energy", "Bullish", 'Two petroleum engineers chatting after a conference panel: "You hear what they found off the coast last month?" "Yeah, the new seismic data? That formation looks massive." "They\'re keeping it quiet for now, but I talked to someone on the exploration team. They\'re very excited. Like, unusually excited." "That\'s interesting. Wonder when they\'ll announce something."'),
    (4, "Energy", "Bearish", 'Employees at a large integrated oil major say morale has taken a significant hit following a surprise reorganization of the upstream division. Several workers who declined to be named described an atmosphere of uncertainty, noting that at least three senior vice presidents have submitted resignation letters in the past six weeks.'),
    (5, "Energy", "Bearish", 'Posted on an energy industry professional forum: "Anyone else hearing that the Permian Basin JV is in trouble? My contact says they\'ve been trying to renegotiate the royalty structure for months and the landowners aren\'t budging. The whole project timeline might slip by 18 months at minimum."'),
    (6, "Energy", "Bullish", '"My brother-in-law works on the pipeline side. He says they\'ve been running double shifts all month." "For maintenance or new throughput?" "New throughput. Some big volume deal they signed. He\'s not supposed to talk about it but he says the numbers are big."'),
    (7, "Energy", "Bearish", 'A LinkedIn post from a recently departed senior geologist at a large oil producer: "After 14 years I\'ve decided to move on. I\'m proud of my work but the direction things are heading no longer aligns with my values or my assessment of where the industry needs to go. Wishing my former colleagues the best."'),
    (8, "Energy", "Bearish", 'Overheard at a Houston energy conference: "The CEO keeps talking about long-term strategy but the board is losing patience. I was in a meeting last week where someone actually said the dividend might not be safe if crude stays in this range another two quarters."'),
    (9, "Energy", "Bullish", 'Multiple sources at an oilfield services company say they\'ve been receiving unusually large equipment orders from one client in particular. One warehouse manager commented, "I don\'t know what they\'re planning but we\'ve shipped more to them in the past month than we did in all of last year."'),
    (10, "Energy", "Bullish", '"The LNG shipping company my firm covers just signed two new offtake agreements." "How long-term?" "15 years. And the counterparties are investment-grade European utilities. In this market, getting long-term credit like that is extremely difficult." "That locks in their revenue base pretty substantially." "It nearly doubles their contracted backlog."'),
    (11, "Energy", "Bearish", '"I heard a senior VP at one of the major integrated oils is actively looking for his next role." "Which division?" "Upstream. He\'s been there 20 years and he\'s suddenly entertaining calls from headhunters. That\'s not a man who sees a bright future in his current seat." "That\'s a meaningful signal. He would know before anyone."'),
    (12, "Energy", "Bearish", 'Workers at a copper-heavy offshore drilling contractor say that two jackup rigs that were supposed to go back into service next quarter have had their reactivation delayed indefinitely. The company cited "operator scheduling changes" but floor-level staff say the contracts were simply not renewed.'),
    # Technology
    (13, "Technology", "Bearish", 'Anonymous review posted on a job site: "The company was great when I joined but the last 18 months have been rough. We\'ve missed internal sales targets three quarters in a row and leadership keeps changing the messaging instead of addressing the product gaps. Engineering is demoralized and turnover is way up."'),
    (14, "Technology", "Bullish", 'Text exchange between two software developers: "Did you see the deployment logs from the new AI feature?" "Yeah the engagement numbers are insane. Like 3x what we expected in the first week." "Don\'t say anything but I heard the enterprise deal pipeline is blowing up too. They\'re hiring a new sales team just for that segment."'),
    (15, "Technology", "Bearish", 'Sources close to the matter indicate that a major cloud provider is quietly renegotiating several large enterprise contracts following customer complaints about uptime reliability. The renegotiations are expected to result in meaningful pricing concessions, potentially impacting revenue recognition in the back half of the fiscal year.'),
    (16, "Technology", "Bearish", 'Thread on a developer forum titled "Anyone else notice the API rate limits getting stricter?": "Yeah they quietly changed the limits last week. No announcement." "I bet they\'re having infrastructure scaling issues." "My sales rep basically confirmed they\'re having some backend problems. Wouldn\'t say more."'),
    (17, "Technology", "Bullish", 'At a tech industry networking event, a product manager from a mid-size SaaS company was heard saying, "We\'ve been trying to keep it under wraps but our churn rate hit an all-time low last month. The new onboarding flow completely changed the retention curve. Finance is scrambling to update the forecast."'),
    (18, "Technology", "Bearish", 'Multiple senior engineers have left a prominent semiconductor design firm in recent months to join smaller startups. Colleagues describe a culture shift following a corporate acquisition that has led to increased bureaucracy and slower decision-making. Several said that key chip architecture projects have been put on hold pending strategic review.'),
    (19, "Technology", "Bullish", '"My wife works in procurement at a big retailer. She says their IT department just approved a massive software license renewal -- way bigger than what they had before." "For which platform?" "She couldn\'t say specifically. But she said it was a seven-figure deal and there was basically no negotiation. They just approved it."'),
    (20, "Technology", "Bearish", 'A comment in a Slack community for product managers: "Just saw three PMs from an unnamed company post their resumes in the job board channel. All senior level. Doesn\'t usually happen like that all at once unless something is going on internally."'),
    (21, "Technology", "Bearish", 'A buy-side analyst mentioned in a private chat: "I\'ve been trying to get channel checks on their GPU orders and the distributors I talked to said orders have been lighter than expected for two months. Either they overbought in Q1 or demand is softer than anyone thinks."'),
    (22, "Technology", "Bullish", 'Tweet from a developer: "Whatever this tech company is doing with their new inference engine, it\'s impressive. We ran benchmarks today and it\'s 40% faster than what we were using before at the same cost. This is going to be hard to compete with."'),
    (23, "Technology", "Bullish", 'A cybersecurity firm is seeing its largest pipeline of enterprise deals in company history, according to its VP of sales who made the comment to a venture investor. The backlog of contracts pending legal review has grown to the point where the legal team has been asked to bring on outside counsel to accelerate deal closings.'),
    (24, "Technology", "Bearish", 'Value-added resellers who distribute software licenses for several enterprise platforms say one vendor has quietly extended payment terms from 30 to 60 days for channel partners. Industry observers note that such changes typically indicate cash flow pressure or a desire to accelerate channel incentive payouts to boost near-term bookings.'),
    # Financial
    (25, "Financial", "Bearish", 'Two portfolio managers at lunch: "You\'ve seen the loan tape from that regional bank?" "Briefly. Why?" "The commercial real estate concentration is higher than what they\'re disclosing in the supplemental. A buddy in their credit department told me they\'ve been quietly moving stuff to held-for-investment to avoid marking it." "That\'s a significant problem if true."'),
    (26, "Financial", "Bullish", 'Word among insurance industry insiders is that a mid-size insurer has been quietly outperforming its loss ratio assumptions for three straight quarters. Underwriters at the firm are reportedly being given more latitude to write business, which some interpret as management confidence in their risk models.'),
    (27, "Financial", "Bearish", 'Several compliance officers at a major financial institution have departed over the past quarter, with at least two citing disagreements over how the firm is handling regulatory risk in its derivatives book. One former employee noted that internal audit findings have been slower to reach the board than in prior years.'),
    (28, "Financial", "Bearish", '"Long-time lurker in fintech but I have to share this. My contact at a payments company says their fraud losses spiked dramatically in Q2 and they\'ve been scrambling to patch the detection systems. They haven\'t said anything publicly. The CFO and the head of risk had a very public disagreement in a town hall."'),
    (29, "Financial", "Bullish", 'Overheard at a financial services conference: "Their mortgage origination pipeline is the best it\'s been in two years. Rates coming down pulled a lot of demand forward that no one expected this soon. They\'re going to beat the street badly this quarter -- I\'d be surprised if there\'s a miss."'),
    (30, "Financial", "Bearish", 'A memo allegedly circulated within a large asset manager suggests that redemption requests across several of their flagship funds have been running above historical averages for the past two months. The document also notes that the firm is reviewing fee structures in anticipation of potential client losses.'),
    (31, "Financial", "Bearish", 'Whisper numbers circulating ahead of a major bank\'s earnings suggest that investment banking fee revenue came in well below expectations, with several marquee deals slipping into the next quarter. Sources also indicate that the fixed income trading desk had a particularly difficult month due to unexpected rate volatility.'),
    (32, "Financial", "Bullish", 'Credit card transaction data aggregated by a research shop suggests that spending at merchants serviced by one particular payment network has been running approximately 12% above the same period last year, significantly ahead of what management guided for at the last investor day.'),
    (33, "Financial", "Bearish", 'LinkedIn post from a former risk manager at a mid-size bank: "It\'s been 90 days since I left and I\'ve had a lot of time to reflect. Some of what I witnessed in the last year at my former employer is still troubling me. I hope the right people are asking the right questions. That\'s all I\'ll say for now."'),
    (34, "Financial", "Bullish", '"The custody bank we use just told us they\'ve brought on three new institutional clients this quarter." "Big ones?" "Two sovereign funds and a pension with combined AUM they said was over $200 billion. That\'s the biggest onboarding quarter they\'ve had in a decade."'),
    (35, "Financial", "Bearish", '"The structured credit desk at a major bank is reportedly seeing early payment defaults in a vintage of CLO tranches that was widely assumed to be clean. If even a small number of performing loans move to watchlist, the mark-to-model pricing on a lot of similar paper is going to come under pressure across the street."'),
    # Healthcare
    (36, "Healthcare", "Bullish", 'Two oncologists at a medical conference: "Have you seen the Phase 2 data from that trial?" "Just the abstract. The response rates are much higher than what anyone was modeling." "I spoke with one of the investigators. She said the durability is what surprised everyone. The median wasn\'t reached at the cutoff date." "That\'s going to be big. Really big."'),
    (37, "Healthcare", "Bearish", 'Several medical device sales representatives from competing firms have noted that one company\'s flagship surgical robot is encountering resistance from hospital procurement committees over reliability complaints. "We\'ve won three deals in the last month that we probably wouldn\'t have won six months ago," said one rep from a rival company.'),
    (38, "Healthcare", "Bearish", 'Posted on a pharmaceutical industry message board: "Word is the FDA reviewers have been sending a lot of follow-up questions on a major NDA submission. Way more than typical for a clean application. Someone in the clinical team told me the response timeline has slipped twice already."'),
    (39, "Healthcare", "Bullish", 'Physicians who have participated in early access programs for a new biologics treatment are reporting patient outcomes that significantly exceed those achieved with current standard of care. Informal feedback collected at a specialist conference suggests strong interest in prescribing the drug once approved, with several doctors describing it as potentially practice-changing.'),
    (40, "Healthcare", "Bearish", '"We just lost our third manufacturing quality VP in two years. I\'ve been here long enough to know that when the regulatory affairs team starts looking nervous before an FDA audit, something is wrong. I\'m not saying anything specific but I\'ve started updating my resume."'),
    (41, "Healthcare", "Bearish", '"The Phase 3 trial enrollment is way behind. They were supposed to hit their target by end of Q2 and they\'re still at 60%." "Is that a protocol amendment issue or is it a site problem?" "Both, from what I hear. And there\'s apparently a safety signal that showed up in an interim review that they\'re evaluating. That\'s never a great sign."'),
    (42, "Healthcare", "Bullish", 'A hospital administrator posted on a healthcare professional network: "After six months of using this vendor\'s supply chain software, our procurement costs are down and our out-of-stock incidents are nearly zero. We\'re expanding from two facilities to all eight by year end. Can\'t recommend it enough."'),
    (43, "Healthcare", "Bearish", 'Pharmacy benefit managers have reportedly begun steering formulary committees away from one company\'s branded drug in favor of a lower-cost biosimilar alternative. If three of the largest PBMs shift coverage, the revenue impact could be material and does not appear to be fully reflected in current consensus estimates.'),
    (44, "Healthcare", "Bullish", '"Their diagnostics division has been on fire. The lab I work with placed a huge order for their reagent kits." "How big?" "Bigger than anything we\'ve seen from them before. And it wasn\'t a one-time thing -- they structured it as a multi-year supply agreement."'),
    (45, "Healthcare", "Bearish", 'A physician specialist posted in a closed online medical community: "I\'ve been getting a lot of manufacturer rep calls lately pushing a newer treatment that I know is under some pricing pressure. The frequency of these calls has tripled in the past two months. When reps get this aggressive, it usually means something changed in the market dynamic."'),
    # Consumer
    (46, "Consumer", "Bearish", 'An anonymous post from a retail store manager: "We\'ve been told to cut floor hours by 20% and freeze all discretionary spending. Returns are running higher than I\'ve ever seen, and we got a memo last week that inventory targets have been revised down significantly. Something is happening at the corporate level that we\'re not being told."'),
    (47, "Consumer", "Bullish", '"I went to four different stores looking for that kitchen appliance brand and everything was sold out." "Which one?" "The one that was in all those social media videos. The stores are saying they\'re backordered and the wait list is weeks long. The manufacturer apparently wasn\'t ready for demand like this."'),
    (48, "Consumer", "Bearish", '"Anyone in CPG notice the shelf space reductions for a major beverage brand? My buyer at two major grocery chains told me independently that they\'re both pulling back on that product line due to slow turns. Distributor says it\'s a national trend, not just regional."'),
    (49, "Consumer", "Bullish", 'A packaging supplier whose clients include several large food and beverage companies says orders have been unusually strong this quarter. "One customer placed a reorder six weeks earlier than their normal cycle," said the supplier. "That tells me they\'re running through inventory faster than they expected."'),
    (50, "Consumer", "Bearish", 'Online reviews and social media complaints about a popular direct-to-consumer brand have increased markedly over the past two months, with recurring themes around product quality degradation and customer service failures. Sentiment analysis of recent reviews shows a significant decline from the brand\'s historically high ratings.'),
    (51, "Consumer", "Bearish", '"My contact at the logistics company that handles their last-mile says return volumes are through the roof." "For the e-commerce play?" "Yeah. And the reverse logistics cost is apparently eating into margins in a way they didn\'t model. The CFO apparently mentioned it internally as a top-of-mind concern."'),
    (52, "Consumer", "Bullish", 'A credit card data analyst was overheard at a fintech meetup: "We\'re seeing something really interesting in the restaurant sector. One casual dining chain is spiking hard in repeat visit frequency, especially among the 25-40 demographic. Whatever they changed in their menu or experience, it\'s working."'),
    (53, "Consumer", "Bearish", 'Multiple trucking companies that service large retail distribution centers say that inbound volume from one major retailer\'s private label supplier has dropped noticeably since last quarter. "They used to run five trucks a week. Now we\'re doing two," said one regional carrier.'),
    (54, "Consumer", "Bullish", 'A consumer finance analyst posted: "I\'ve been tracking credit card spending data from three different aggregators and one travel brand stands out. Transaction frequency is up, average ticket is up, and geographic expansion of their customer base is accelerating. This looks like a brand that\'s genuinely broken into a new customer cohort."'),
    (55, "Consumer", "Bearish", 'Review from a former buyer at a national retail chain: "The vendor selection process has become chaotic. We lost three experienced category managers in two months and the replacements have been making decisions without fully understanding the supply chain implications. Brand partners are frustrated and some are starting to look at other retail partners."'),
    # Industrials
    (56, "Industrials", "Bullish", 'Two supply chain managers at an industry meetup: "We can\'t get enough fasteners. Our primary supplier is quoting 16-week lead times." "Same. Who\'s your primary?" "An unnamed company. But here\'s the thing -- they told us they\'ve added a night shift at two of their plants. First time in four years." "That means everyone is ordering. Backlog must be huge."'),
    (57, "Industrials", "Bearish", '"My company just canceled three capital equipment orders that were placed earlier this year. Management cited strategic reprioritization. Honestly, the demand just isn\'t there to justify the capacity expansion anymore. I know of at least two other companies in our space doing the same thing."'),
    (58, "Industrials", "Bullish", 'A steel distributor with clients across several manufacturing sectors says orders from the construction and infrastructure segment have been running ahead of plan all year. "The big government infrastructure projects are starting to actually pull material. We had expected that in Q4 but it started in Q2."'),
    (59, "Industrials", "Bearish", 'Workers at an industrial equipment manufacturing plant say production has been disrupted by a component shortage that the company has publicly described as resolved. Floor-level employees indicate that output remains roughly 25% below normal capacity and that shipment dates to key customers have been quietly pushed out.'),
    (60, "Industrials", "Bearish", 'Overheard at an engineering trade show: "Their aftermarket parts business is getting hammered. Customers are starting to do more repairs in-house because the lead times are so bad. Once that behavior change sets in, it\'s really hard to reverse -- customers find out they can do it themselves and they don\'t come back."'),
    (61, "Industrials", "Bullish", '"The aerospace division signed a deal I wasn\'t expecting. Big one." "How big?" "Multi-year, sole source. For the next generation platform. I saw the contract value in a document I wasn\'t supposed to see." "That changes their mix significantly." "Exactly. And margins on that program type are much better than commercial."'),
    (62, "Industrials", "Bearish", 'Checks with tier-two auto parts suppliers indicate that production schedule cuts by a major automaker have been communicated to vendors but not yet disclosed publicly. Two suppliers confirmed they received revised purchase orders for Q3 that were 15-20% below prior guidance, citing anticipated softness in consumer demand for new vehicles.'),
    (63, "Industrials", "Bullish", 'Post from a construction project manager: "I\'ve been managing large commercial builds for 20 years and I\'ve never seen this level of activity in the industrial warehouse and data center segment. We have more projects in our pipeline right now than at any point in my career. The equipment and labor markets are stretched thin."'),
    (64, "Industrials", "Bearish", '"We were supposed to hit a major delivery milestone for a key customer this quarter. Instead, we\'re looking at a two-month delay because of a tooling problem that management knew about six weeks ago. The customer is not happy and there are penalty clauses involved. Leadership hasn\'t told the board yet."'),
    (65, "Industrials", "Bullish", 'Defense contractors in two adjacent supplier tiers confirm that program funding previously delayed by budget negotiations has been released. Multiple vendors report receiving purchase orders with accelerated delivery schedules, suggesting that the prime contractor has been given urgency mandates from the government customer on at least two platform programs.'),
    # Real Estate
    (66, "Real Estate", "Bearish", '"Downtown Class A vacancy is worse than the numbers show." "How so?" "There are two large blocks of space that are technically leased but the tenants are subleasing all of it. The landlord doesn\'t have to disclose sublease vacancy. The real vacancy is probably 8-10 points higher than the official number." "That\'s going to be very bad when those leases come up for renewal."'),
    (67, "Real Estate", "Bearish", 'Posted by a commercial real estate broker: "Getting a lot of calls from building owners asking about distressed sale comps. Normally I might get one of those calls a month. In the last three weeks I\'ve had seven. Something is shifting in owner psychology -- people are starting to price in the worst."'),
    (68, "Real Estate", "Bullish", 'A major REIT\'s property management team has reportedly renewed two anchor tenant leases at significantly higher rates than their expiring contracts, with lease terms of 10 years and no rent concessions. Brokers who worked on the deals described landlord leverage as unusually strong for the current environment.'),
    (69, "Real Estate", "Bearish", 'At a real estate finance conference: "The lender I deal with most on multifamily bridge loans just told me they\'re pulling back hard. Debt service coverage is thin on a lot of deals and they\'re seeing early signs of borrower stress. They\'re not renewing any floating rate loans without meaningful paydowns."'),
    (70, "Real Estate", "Bullish", '"Industrial vacancy in that submarket just hit the lowest level since they started tracking it." "Really? I thought the new supply was supposed to bring it back up." "The new deliveries got absorbed in like three weeks. There\'s a semiconductor fab and two data center projects that just pre-leased everything. The developers are scrambling to find more land."'),
    (71, "Real Estate", "Bearish", '"Watching the hotel transactions market closely. Bid-ask spread is still wide but I\'m seeing more motivated sellers than I have in two years. The ones who did floating rate acquisitions in 2021 and 2022 with short-term debt are starting to feel real pain. If rates stay here, the forced sales start by year-end."'),
    # Airlines
    (72, "Airlines", "Bearish", 'A flight attendant posted in a union forum: "Corporate travel bookings are way down from this time last year according to what our union reps were told in the last negotiation meeting. Management tried to spin it as seasonal but people in scheduling are saying it doesn\'t look seasonal to them."'),
    (73, "Airlines", "Bullish", 'Overheard between two airline gate agents: "We\'ve had zero empty seats on international routes for six straight weeks. Normally we get some attrition. Not now. Yield management is thrilled -- the prices they\'re getting on certain routes are the highest I\'ve ever seen printed on a ticket."'),
    (74, "Airlines", "Bearish", '"I manage a hotel in a major business travel hub and forward bookings for the next 90 days are softer than they\'ve been in three years." "Is it pricing or actual volume?" "Volume. We\'ve dropped rates twice to stimulate demand and it\'s not moving. Corporate accounts are cutting travel budgets. I\'m hearing the same from three other properties in the same market."'),
    (75, "Airlines", "Bullish", 'A regional catering supplier that services several major carriers says meal orders have jumped meaningfully in the past four weeks, with one airline expanding its in-flight service options on domestic routes for the first time since the pandemic. The supplier called it "a clear signal they\'re expecting fuller planes and higher revenue per seat."'),
    # Mining
    (76, "Mining", "Bearish", 'Workers at a copper mine say production has been intermittently halted due to ongoing labor negotiations that the company has publicly described as constructive. Sources on the ground say the situation is far from resolved, with at least three days of production lost in the past two weeks alone.'),
    (77, "Mining", "Bullish", '"The assay results from the new zone are exceptional." "How exceptional?" "I looked at the early data. If the density holds up across the section, this changes the mine life calculation by at least a decade. The technical team is trying not to get too excited but the geologist who ran the core said she\'s never seen grades like this from this deposit."'),
    (78, "Mining", "Bearish", 'Geological consultants who have reviewed an exploration company\'s latest drill results say the results are more mixed than the company\'s press release suggests. "The high-grade intercepts they highlighted are real, but they\'re isolated. The continuity between holes is poor, which matters a lot for resource modeling."'),
    (79, "Mining", "Bullish", '"The royalty stream deal that closed last month didn\'t get much attention but I think it\'s significant. The operator is committing to a minimum throughput that\'s 30% above what the current run rate would imply. Either they know something about the grade expansion or they\'ve already pre-sold the output. Either way it\'s a positive signal."'),
    # Utilities
    (80, "Utilities", "Bearish", 'State regulators have reportedly raised informal concerns about a utility company\'s rate increase application, signaling potential pushback ahead of a formal hearing. Sources close to the proceedings say commissioners are particularly focused on the company\'s capital spending forecast, which critics argue is inflated relative to demonstrated need.'),
    (81, "Utilities", "Bullish", '"The power purchase agreement that utility signed last year for renewable capacity is starting to look brilliant. Spot market prices in that region have gone up dramatically and they\'re locked into low-cost generation for another 18 years. Their cost position relative to competitors is going to be a significant advantage going forward."'),
    (82, "Utilities", "Bearish", '"One of the large investor-owned utilities is having serious issues with their transmission upgrade project." "How serious?" "Two years behind and the cost estimate just got revised upward for the third time. The regulator is not happy and there\'s talk of disallowing a portion of the costs from rate base recovery." "That would be a significant earnings hit."'),
    (83, "Utilities", "Bullish", 'Electrical contractors working in a utility\'s service territory report an unusual surge in large commercial interconnection applications, primarily from data center developers. "We\'ve never processed this many high-voltage service requests in a single quarter," said one project manager. "The backlog is substantial and growing."'),
    # Telecom
    (84, "Telecom", "Bearish", 'Retail store managers at a wireless carrier say that upgrade activity has been unusually slow despite a major new handset launch. "Normally a release like this drives a lot of foot traffic. This time, people are coming in, looking at the new phone, and leaving without upgrading. The economics of the trade-in deals just don\'t work for them right now."'),
    (85, "Telecom", "Bullish", 'Network engineering contractors hired for tower upgrades in rural corridors confirm that rollout pace for 5G infrastructure has accelerated meaningfully compared to what was projected at the beginning of the year. One contractor noted that their client added scope to three separate tower clusters in a single week -- something they described as operationally unusual.'),
    (86, "Telecom", "Bearish", 'A network operations employee posted anonymously: "Churn in our enterprise segment is bad and getting worse. The retention team has been given more discount authority than I\'ve ever seen, which tells me leadership is panicking about losing accounts. We\'ve been in reactive mode for three months straight."'),
    # Semiconductors
    (87, "Semiconductors", "Bullish", '"The foundry is running at full utilization and they just told us lead times are going back to 26 weeks." "Which process node?" "Everything. Mature nodes, advanced nodes. Across the board." "That\'s not what I was expecting to hear this quarter." "Me neither. Something changed in the order book fast. I don\'t know if it\'s AI buildout or defense procurement but the demand is real."'),
    (88, "Semiconductors", "Bearish", '"Inventory correction in the consumer electronics segment isn\'t over. My contact at a chip distributor says they\'re sitting on stock that customers don\'t want yet. The OEMs are still burning through what they overbought during the shortage and aren\'t placing new orders. We\'re probably two more quarters away from a clean reset."'),
    (89, "Semiconductors", "Bullish", 'A packaging and test subcontractor that handles final production steps for several fabless chip companies says orders have been rescheduled to pull in -- meaning customers want product earlier than originally planned. "When customers pull in, it means their end demand came in ahead of forecast. When they push out, the opposite. Right now, everyone is pulling in."'),
    (90, "Semiconductors", "Bearish", 'Equipment suppliers to the memory chip segment report that capital expenditure plans communicated by their major customers have been revised downward for the second consecutive quarter. Tool orders for advanced DRAM capacity expansion have been deferred, and one equipment vendor noted that the push-out requests now extend into the following fiscal year.'),
    # Agriculture
    (91, "Agriculture", "Bearish", 'Grain elevator operators in the Midwest report that farmer selling activity has slowed dramatically as producers hold crops in anticipation of better prices. Multiple elevators say their storage is operating near capacity, which is unusual for this point in the season, and that the backup is beginning to affect logistics planning for incoming harvest.'),
    (92, "Agriculture", "Bullish", '"The crop protection company we cover just told a distributor of mine that they\'re sold out of their top herbicide SKU through the end of the season." "Sold out or allocated?" "Fully sold out. They\'ve already invoiced everything. And the distributor said three other suppliers called him asking if he had any to spare." "That\'s a tight supply picture."'),
    # Logistics
    (93, "Logistics", "Bearish", 'A freight brokerage executive speaking at an industry dinner: "Spot rates on dry van lanes have collapsed below operating cost for a lot of small carriers. We\'re watching some of our carrier base go dark -- they\'re parking trucks rather than run at a loss. Volume is fine but pricing power is completely gone for now."'),
    (94, "Logistics", "Bullish", 'An intermodal logistics company says booking lead times have stretched from three days to nearly two weeks over the past month as shippers scramble for capacity. "This is what the beginning of a freight cycle looks like," said their VP of sales. "We\'ve tripled our rate sheet and customers are still accepting it."'),
    (95, "Logistics", "Bearish", 'A warehouse operations supervisor posted in an industry group: "Our throughput numbers are down 30% from this time last year and we\'re running two shifts where we used to run three. The e-commerce client that used to fill a third of our space gave back half their footprint last month. Nobody is saying it out loud but we\'re all wondering what the renewal looks like."'),
    # Media
    (96, "Media", "Bearish", 'Ad agency buyers say that one major streaming platform has been unusually aggressive in offering inventory discounts ahead of its upfront negotiations -- a reversal from its posture in prior years. Two media buyers independently described being offered rates 20-25% below their expectations, which they interpreted as a sign of weaker-than-expected advertising demand on the platform.'),
    (97, "Media", "Bullish", '"Their podcast advertising revenue just had its best month ever according to someone in their sales org." "Organic or new clients?" "A mix, but mostly new. Three Fortune 500 brands that hadn\'t advertised with them before just signed annual commitments. The sales team is apparently in shock at how quickly the upfront went."'),
    (98, "Media", "Bearish", '"Digital ad spend tracking data I\'m looking at shows a major social platform\'s share of total budgets dropped three points this quarter among mid-market advertisers. The feedback from media buyers is consistent: CPMs are rising but conversion rates are falling. Brands are quietly reallocating to search and connected TV."'),
    # Biotech
    (99, "Biotech", "Bullish", '"One of the principal investigators on that gene therapy trial just updated his conference calendar." "What do you mean?" "He canceled two speaking slots he\'d had for months and added himself to the late-breaking abstracts session at the biggest conference of the year. You only do that when you have data you didn\'t expect to have this early." "That\'s a very specific tell."'),
    (100, "Biotech", "Bearish", 'Contract research organizations that handle clinical operations for a small biotech say the company has requested scope reductions on two active studies and has been slow to pay invoices that are 45-60 days past due. CRO project managers describe internal communication from the sponsor as increasingly sporadic -- a pattern they associate with companies managing a cash runway problem.'),
]


async def run_all_tests():
    results = []
    failures = []
    total = len(TEST_CASES)

    for i, (case_num, expected_sector, expected_direction, text) in enumerate(TEST_CASES):
        expected_gics_sectors = SECTOR_MAP[expected_sector]
        expected_dir = DIRECTION_MAP[expected_direction]

        print(f"[{i+1}/{total}] Case #{case_num} ({expected_sector} - {expected_direction})...", end=" ", flush=True)

        try:
            # Retry up to 3 times on rate limit errors
            result = None
            for attempt in range(3):
                try:
                    result = await extract_signal(text)
                    break
                except Exception as retry_e:
                    if "429" in str(retry_e) and attempt < 2:
                        print(f"RATE LIMITED, waiting 60s...", end=" ", flush=True)
                        await asyncio.sleep(60)
                    else:
                        raise retry_e
            predicted_sector = result.get("sector", "UNKNOWN")
            predicted_direction = result.get("direction", "UNKNOWN")

            sector_match = any(exp.lower() in predicted_sector.lower() or predicted_sector.lower() in exp.lower() for exp in expected_gics_sectors)
            direction_match = predicted_direction.lower() == expected_dir.lower()

            status = "PASS" if (sector_match and direction_match) else "FAIL"
            if not sector_match and not direction_match:
                fail_type = "SECTOR+DIRECTION"
            elif not sector_match:
                fail_type = "SECTOR"
            elif not direction_match:
                fail_type = "DIRECTION"
            else:
                fail_type = None

            results.append({
                "case": case_num,
                "expected_sector": expected_sector,
                "expected_direction": expected_direction,
                "predicted_sector": predicted_sector,
                "predicted_direction": predicted_direction,
                "sector_match": sector_match,
                "direction_match": direction_match,
                "status": status,
                "signal_summary": result.get("signal_summary", ""),
            })

            if status == "FAIL":
                failures.append(results[-1])
                print(f"FAIL ({fail_type}: expected {expected_gics_sectors}/{expected_dir}, got {predicted_sector}/{predicted_direction})")
            else:
                print("PASS")

        except Exception as e:
            print(f"ERROR: {e}")
            results.append({
                "case": case_num,
                "expected_sector": expected_sector,
                "expected_direction": expected_direction,
                "predicted_sector": "ERROR",
                "predicted_direction": "ERROR",
                "sector_match": False,
                "direction_match": False,
                "status": "ERROR",
                "signal_summary": str(e),
            })
            failures.append(results[-1])

        # Rate limit: free tier allows 5 requests/min for gemini-2.5-flash
        # Wait 13 seconds between requests to stay under limit
        if i < total - 1:
            await asyncio.sleep(13)

    # Summary
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    errors = sum(1 for r in results if r["status"] == "ERROR")

    print(f"\n{'='*60}")
    print(f"RESULTS: {passed}/{total} passed | {failed} failed | {errors} errors")
    print(f"{'='*60}")

    if failures:
        print(f"\nFAILED CASES:")
        for f in failures:
            print(f"\n  Case #{f['case']}: {f['expected_sector']} - {f['expected_direction']}")
            print(f"    Predicted: {f['predicted_sector']} / {f['predicted_direction']}")
            print(f"    Summary: {f['signal_summary'][:120]}...")

    # Save full results
    with open("/workspaces/HackAI/test_results.json", "w") as fp:
        json.dump(results, fp, indent=2)
    print(f"\nFull results saved to test_results.json")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
