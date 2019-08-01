#!/bin/bash
# For detail introduction, please see http://www.jamescoyle.net/how-to/963-set-up-linux-pptp-client-from-the-terminal
# exit when error occur
set -o errexit
set -o nounset
# Bash will remember & return the highest exitcode in a chain of pipes.
# This way you can catch the error in case mysqldump fails in `mysqldump |gzip`
set -o pipefail

domain='bitinvo.nasetech.com'
pptpuser='cabinet'
password='iJdf294bKd'
host='bitinvo.nasetech.com'

# Install pptpd 
sudo apt-get install pptp-linux -y

# Set up password and user name in chap-secret
echo -e "
#[USER]    [SERVER]    [SECRET]    [IP]
${pptpuser}    PPTP    ${password}    *
" | sudo tee --append /etc/ppp/chap-secrets > /dev/null

# Set up route, use netstat -rn to check
echo -e "
#!/bin/bash
# all traffic goes to ppp0
route add -net 0.0.0.0/32 dev ppp0
" | sudo tee --append /etc/ppp/ip-up.d/${domain}-traffic > /dev/null
chmod +x /etc/ppp/ip-up.d/${domain}-traffic

# Set up PPTP configuration
echo -e "
pty \"pptp ${host} --nolaunchpppd\"
name ${pptpuser}
remotename PPTP
require-mppe-128
file /etc/ppp/options.pptp
ipparam ${domain}
" | sudo tee --append /etc/ppp/peers/${domain} > /dev/null

# Step 6. Configure firewall
iptables -A INPUT -i pptp -j ACCEPT
iptables -A OUTPUT -j ACCEPT
iptables-save

# start client
sudo pon ${domain}

# or use sudo crontab -e to edit, root is required: * * * * * su -c "home/bitinvo/scripts/vpn_check.sh"
su -c "echo \"* * * * * root bash $(pwd)/vpn_check.sh\" > /etc/cron.d/vpn_check"

