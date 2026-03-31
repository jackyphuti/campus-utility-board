const defaultUniversityDomains = [
  'tuks.co.za',
  'mylife.unisa.ac.za',
  'students.wits.ac.za',
  'student.uj.ac.za',
  'myuct.ac.za',
  'student.sun.ac.za',
  'myuwc.ac.za',
  'mycput.ac.za',
  'stu.ukzn.ac.za',
  'dut4life.ac.za',
  'student.mut.ac.za',
  'stu.unizulu.ac.za',
  's.mandela.ac.za',
  'campus.ru.ac.za',
  'ufh.ac.za',
  'students.wsu.ac.za',
  'ufs4life.ac.za',
  'student.cut.ac.za',
  'tut4life.ac.za',
  'student.vut.ac.za',
  'students.smu.ac.za',
  'student.nwu.ac.za',
  'keyaka.ul.ac.za',
  'student.univen.ac.za',
  'ump.ac.za',
  'students.spu.ac.za',
  'campus.local'
];

const configuredDomains = String(process.env.ALLOWED_UNIVERSITY_DOMAINS || '')
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

const allowedUniversityDomains = configuredDomains.length > 0 ? configuredDomains : defaultUniversityDomains;

function normalizeEmailDomain(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex < 0) return '';
  return normalized.slice(atIndex + 1);
}

function isAllowedCampusEmail(email) {
  const domain = normalizeEmailDomain(email);
  if (!domain) return false;
  return allowedUniversityDomains.includes(domain);
}

module.exports = {
  allowedUniversityDomains,
  isAllowedCampusEmail,
};
