my $N = 15;

sub F {
  my ($n) = @_;
  my $r = 1;
  for (my $i = 1; $i <= $n; $i++) {
     $r = $r * $i;
  }
  return $r;
}

sub C {
  my ($k, $n) = @_;
  return int(F($n)/(F($n-$k)*F($k)));
}

sub P {
  my ($k, $n) = @_;
  return $k**$n;
}

sub X {
  my ($k, $n) = @_;
  return C($k,$n)*P(5,$n-$k);
}

sub Y {
  my ($k, $n) = @_;
  return C($k,$n)*P(4,$n-$k)*P(2,$k);
}

sub R {
  my ($k, $n) = @_;
  my $r = 0;
  for (my $i = $k; $i <= $n; $i++) {
     $r = $r + Y($i,$n);
  }
  return $r / P(6,$n);
}

for (my $x = 1; $x <= $N; $x++) {
  my $r = R($x,$N);
  print "$r\n";
}


