#if defined(__sun)
namespace std
{
  int isnan  (int         x);
  int isnan  (float       x);
  int isnan  (double      x);
  int isnan  (long double x);

  int isinf(int         x);
  int isinf(float       x);
  int isinf(double      x);
  int isinf(long double x);
}
#endif