/**
 * SMS Service — Development Mode
 *
 * Currently logs OTP to the backend console.
 * To connect a real SMS provider later (MSG91, Twilio, etc.),
 * replace the body of this function. The interface stays the same.
 *
 * Architecture:   sendOtpSms(phone, otp) → provider sends message
 */
export const sendOtpSms = async (phone, otp) => {
    console.log('\n📱 [DEV SMS] ─────────────────────────────');
    console.log(`   To   : ${phone}`);
    console.log(`   OTP  : ${otp}`);
    console.log(`   Exp  : 10 minutes`);
    console.log('─────────────────────────────────────────\n');
    return { mode: 'development', to: phone };
};
