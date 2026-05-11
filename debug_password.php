<?php
// Debug password comparison issue
echo "<h2>Password Debug Tool</h2>";

if ($_POST['password1'] && $_POST['password2']) {
    $pass1 = $_POST['password1'];
    $pass2 = $_POST['password2'];
    
    echo "<p>Password 1: '$pass1' (length: " . strlen($pass1) . ")</p>";
    echo "<p>Password 2: '$pass2' (length: " . strlen($pass2) . ")</p>";
    echo "<p>Exact match: " . ($pass1 === $pass2 ? 'YES' : 'NO') . "</p>";
    echo "<p>Trimmed match: " . (trim($pass1) === trim($pass2) ? 'YES' : 'NO') . "</p>";
    echo "<p>JSON comparison: " . (json_encode($pass1) === json_encode($pass2) ? 'YES' : 'NO') . "</p>";
}

?>
<form method="post">
    <h3>Test Password Comparison</h3>
    <input type="password" name="password1" placeholder="Password 1" required><br><br>
    <input type="password" name="password2" placeholder="Password 2" required><br><br>
    <button type="submit">Test Comparison</button>
</form>
?>
