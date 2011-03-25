#if defined(__sun)
namespace std
{
  int isnan  (int         x) { return x != x; }
  int isnan  (float       x) { return x != x; }
  int isnan  (double      x) { return x != x; }
  int isnan  (long double x) { return x != x; }

  int isinf(int         x) { return !isnan (x) && isnan (x - x); }
  int isinf(float       x) { return !isnan (x) && isnan (x - x); }
  int isinf(double      x) { return !isnan (x) && isnan (x - x); }
  int isinf(long double x) { return !isnan (x) && isnan (x - x); }
}
#endif