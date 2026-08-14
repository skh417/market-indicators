import type { EventMarket } from '@/lib/types'

export type CalendarCompany = {
  name: string
  market: EventMarket
  symbols: string[]
  irUrl: string
  /** OpenDART 고유번호(8자리). KR 기업의 공시 조회에 사용 */
  dartCode?: string
}

// 시장 전체에 영향력이 큰 기업만 추린다. 한국 일정은 IR 공지 또는 DART 공시가 확인될 때만 표시한다.
export const CALENDAR_COMPANIES: CalendarCompany[] = [
  { name: 'Apple', market: 'US', symbols: ['AAPL'], irUrl: 'https://investor.apple.com/' },
  { name: 'Microsoft', market: 'US', symbols: ['MSFT'], irUrl: 'https://www.microsoft.com/en-us/Investor/' },
  { name: 'NVIDIA', market: 'US', symbols: ['NVDA'], irUrl: 'https://investor.nvidia.com/' },
  { name: 'Amazon', market: 'US', symbols: ['AMZN'], irUrl: 'https://ir.aboutamazon.com/' },
  { name: 'Alphabet', market: 'US', symbols: ['GOOGL', 'GOOG'], irUrl: 'https://abc.xyz/investor/' },
  { name: 'Meta', market: 'US', symbols: ['META'], irUrl: 'https://investor.atmeta.com/' },
  { name: 'Tesla', market: 'US', symbols: ['TSLA'], irUrl: 'https://ir.tesla.com/' },
  { name: 'Broadcom', market: 'US', symbols: ['AVGO'], irUrl: 'https://investors.broadcom.com/' },
  { name: 'AMD', market: 'US', symbols: ['AMD'], irUrl: 'https://ir.amd.com/' },
  { name: 'JPMorgan Chase', market: 'US', symbols: ['JPM'], irUrl: 'https://www.jpmorganchase.com/ir' },
  { name: 'Walmart', market: 'US', symbols: ['WMT'], irUrl: 'https://stock.walmart.com/' },
  { name: 'Exxon Mobil', market: 'US', symbols: ['XOM'], irUrl: 'https://corporate.exxonmobil.com/investors' },
  { name: '삼성전자', market: 'KR', symbols: ['005930.KS', '005930'], irUrl: 'https://www.samsung.com/global/ir/', dartCode: '00126380' },
  { name: 'SK하이닉스', market: 'KR', symbols: ['000660.KS', '000660'], irUrl: 'https://news.skhynix.com/ir/', dartCode: '00164779' },
  { name: '현대차', market: 'KR', symbols: ['005380.KS', '005380'], irUrl: 'https://www.hyundai.com/kr/ko/company-ir', dartCode: '00164742' },
  { name: '기아', market: 'KR', symbols: ['000270.KS', '000270'], irUrl: 'https://www.kia.com/kr/ir/main.html', dartCode: '00106641' },
  { name: 'LG에너지솔루션', market: 'KR', symbols: ['373220.KS', '373220'], irUrl: 'https://www.lgensol.com/company/investor-relations', dartCode: '01515323' },
  { name: '삼성바이오로직스', market: 'KR', symbols: ['207940.KS', '207940'], irUrl: 'https://www.samsungbiologics.com/kr/ir/main.do', dartCode: '00877059' },
  { name: 'NAVER', market: 'KR', symbols: ['035420.KS', '035420'], irUrl: 'https://www.navercorp.com/investment/financial', dartCode: '00266961' },
  { name: 'KB금융', market: 'KR', symbols: ['105560.KS', '105560'], irUrl: 'https://www.kbfg.com/Eng/ir/financialInfo.jsp', dartCode: '00688996' },
  { name: 'POSCO홀딩스', market: 'KR', symbols: ['005490.KS', '005490'], irUrl: 'https://www.posco-inc.com:4453/eng/ir/financial/s91c1000000.jsp', dartCode: '00155319' },
  { name: 'HD현대중공업', market: 'KR', symbols: ['329180.KS', '329180'], irUrl: 'https://www.hhi.co.kr/eng/IR', dartCode: '01390344' },
  { name: '현대모비스', market: 'KR', symbols: ['012330.KS', '012330'], irUrl: 'https://www.mobis.com/kr/ir/financial-info/financial-info.do', dartCode: '00164788' },
  { name: '삼성물산', market: 'KR', symbols: ['028260.KS', '028260'], irUrl: 'https://www.samsungcnt.com/eng/ir/financial/financial.do', dartCode: '00149655' },
]
